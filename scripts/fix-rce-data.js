const fs = require('fs')
const path = require('path')
const { isEqual, cloneDeep } = require('lodash')

const PLOTLINE_TEMPLATES_DIRECTORY = 'templates/plotlines'
const PROJECT_TEMPLATES_DIRECTORY = 'templates/project'

/**
 * NOTE(ed): this file is based on `handleSpecialCases.js` from
 * `plottr_desktop`.  It may be necessary to incorporate fixes from
 * that repository when/if the relevant functions copied from there
 * receive improvements.
 *
 * Functions copied include:
 *  - fixParentingInSlate
 *  - removeNullTextPropertiesInText
 *  - defaultMissingURLsInLinksLackingAURL
 */

/**
 * I encountered a file in the wild where there's a link that doesn't
 * have a URL on a link element.  This breaks the schema, let's go
 * ahead and fix that.
 */
const defaultMissingURLsInLinksLackingAURL = (slate) => {
  const slateCopy = cloneDeep(slate)

  function iter(node) {
    if ('text' in node) {
      return
    } else {
      switch (node.type) {
        case 'link': {
          if (!('url' in node) || typeof node.url !== 'string') {
            node.url = ''
          }
          return
        }
        case 'heading-one':
        case 'heading-two':
        case 'image-data':
        case 'image-link': {
          // NOTE(ed): there are no link elements allowed as children of these nodes.
          return
        }
        default: {
          for (const child of node.children) {
            iter(child)
          }
          return
        }
      }
    }
  }

  for (const rootElement of slateCopy) {
    iter(rootElement)
  }

  if (!isEqual(slateCopy, slate)) {
    return slateCopy
  } else {
    return slate
  }
}

/**
 * I encountered a file in the wild where there was a `fontSize` of
 * `null`.  The text should not have had a `fontSize` property at all
 * in this case.
 */
const removeNullTextPropertiesInText = (slate) => {
  const slateCopy = cloneDeep(slate)

  function iter(node) {
    if ('text' in node) {
      const propertiesThatCannotBeNull = [
        'bold',
        'italic',
        'underline',
        'strike',
        'color',
        'font',
        'fontSize',
      ]
      for (const property of propertiesThatCannotBeNull) {
        if (node[property] === null) {
          delete node[property]
        }
      }
    } else {
      for (const child of node.children) {
        iter(child)
      }
      return
    }
  }

  for (const rootElement of slateCopy) {
    iter(rootElement)
  }

  if (!isEqual(slateCopy, slate)) {
    return slateCopy
  } else {
    return slate
  }
}

/**
 * Fix the parenting of Slate nodes.
 *
 * NOTE(ed): The majority that I've seen in practice are that a node
 * is parented by the wrong parent.
 */
const fixParentingInSlate = (slate) => {
  const mutatedSlate = cloneDeep(slate)

  const iter = (parent, nodeIndex, node) => {
    const determineAction = (child) => {
      if ('text' in child && typeof child.text === 'string') {
        if ('type' in node && (node.type === 'bulleted-list' || node.type === 'numbered-list')) {
          return ['WRAP', 'list-item']
        } else if (
          'type' in node &&
          node.type !== 'paragraph' &&
          node.type !== 'list-item' &&
          node.type !== 'link' &&
          node.type !== 'heading-one' &&
          node.type !== 'heading-two'
        ) {
          return ['WRAP', 'paragraph']
        } else {
          return ['NONE']
        }
      } else if ('type' in child) {
        if (
          'type' in node &&
          node.type === child.type &&
          node.type !== 'bulleted-list' &&
          node.type !== 'numbered-list'
        ) {
          // NOTE(ed): only bulleted-list and numbered-list may be
          // parents of themselves.  Every other duplicate parent
          // chain should be flattened by splicing the children back
          // into the node.
          return ['SPLICE']
        } else {
          switch (child.type) {
            case 'list-item': {
              if ('type' in node && node.type === 'root') {
                return ['WRAP', 'bulleted-list']
              } else if (
                'type' in node &&
                node.type !== 'bulleted-list' &&
                node.type !== 'numbered-list'
              ) {
                return ['SPLICE_PEER']
              } else {
                return ['NONE']
              }
            }
            case 'link': {
              if (
                'type' in node &&
                (node.type === 'bulleted-list' || node.type === 'numbered-list')
              ) {
                return ['WRAP', 'list-item']
              } else if ('type' in node && node.type !== 'paragraph' && node.type !== 'list-item') {
                return ['WRAP', 'paragraph']
              } else {
                return ['NONE']
              }
            }
            case 'bulleted-list':
            case 'numbered-list': {
              if (
                'type' in node &&
                node.type !== 'bulleted-list' &&
                node.type !== 'numbered-list' &&
                node.type !== 'root'
              ) {
                return ['SPLICE_PEER']
              } else {
                return ['NONE']
              }
            }
            case 'image-data':
            case 'image-link':
            case 'paragraph':
            case 'heading-two':
            case 'heading-one': {
              if ('type' in node && node.type !== 'root' && node.type !== 'block-quote') {
                return ['SPLICE_PEER']
              } else {
                return ['NONE']
              }
            }
            case 'block-quote': {
              if ('type' in node && node.type !== 'root') {
                return ['SPLICE_PEER']
              } else {
                return ['NONE']
              }
            }
            default: {
              // To be safe, let's just keep the child when it doesn't
              // look right.  The Slate Editor Normalizer will step in
              // later and fix it up.
              return ['NONE']
            }
          }
        }
      } else {
        return ['NONE']
      }
    }

    /**
     * @return {boolean}
     */
    const processChildren = () => {
      /**
       * @return {boolean}
       */
      const finish = () => {
        if ('type' in node && node.type === 'root') {
          return processChildren()
        } else {
          return true
        }
      }
      if ('children' in node && Array.isArray(node.children)) {
        if (!('type' in node)) {
          // We're very deliberately changing the type of this node
          // here.  The schema of the RCE is totally off and it
          // doesn't specify any type at this point.
          //
          // @ts-ignore
          node.type = 'paragraph'
          return finish()
        } else {
          for (let i = 0; i < node.children.length; ++i) {
            const child = node.children[i]
            const [action, arg] = determineAction(child)
            if (action === 'SPLICE' && 'children' in child) {
              node.children.splice(i, 1, ...child.children)
              return finish()
            } else if (
              action === 'SPLICE_PEER' &&
              parent &&
              'children' in parent &&
              Array.isArray(parent.children)
            ) {
              const atStart = i === 0
              const atEnd = i === node.children.length - 1
              node.children.splice(i, 1)
              if (atStart) {
                // NOTE(ed): Child is at the start of the children, add
                // it before the node in the parent's children.
                parent.children.splice(nodeIndex, 0, child)
              } else if (atEnd) {
                // NOTE(ed): Child is at the end of the children, add it
                // after the node in the parent's children.
                parent.children.splice(nodeIndex + 1, 0, child)
              } else {
                // NOTE(ed): Child is in the middle of the children,
                // split the node into two, and put the child in between
                // those nodes in the parent's children.
                parent.children.splice(nodeIndex + 1, 0, child)
                const secondHalfOfNode = cloneDeep(node)
                // NOTE(ed): we don't slice from i + 1 because we
                // already spliced an element out (at i) a few lines
                // ago.
                secondHalfOfNode.children = secondHalfOfNode.children.slice(i)
                parent.children.splice(
                  nodeIndex + 2,
                  0,
                  // NOTE(ed): these children must be just as valid as
                  // the children that were already there since they
                  // came from a parent with the same type.
                  //
                  // @ts-ignore
                  secondHalfOfNode
                )
                node.children = node.children.slice(0, i)
              }
              return finish()
            } else if (action === 'WRAP') {
              if ('text' in child) {
                node.children.splice(i, 1, { type: arg, children: [child] })
                return finish()
              } else if ('type' in child) {
                // NOTE(ed): the TS compiler has issues if you don't lay
                // out each wrapping case in its own branch.  I think it
                // might be bundling together the property types into
                // unions and then it runs into a problem when you
                // combine the branches :/
                if (child.type === 'list-item' && arg === 'bulleted-list') {
                  node.children.splice(i, 1, { type: arg, children: [child] })
                  return finish()
                } else if (
                  child.type === 'link' &&
                  (node.type === 'bulleted-list' || node.type === 'numbered-list')
                ) {
                  node.children.splice(i, 1, { type: arg, children: [child] })
                  return finish()
                } else if (child.type === 'link' && node.type !== 'paragraph') {
                  node.children.splice(i, 1, { type: arg, children: [child] })
                  return finish()
                }
              }
            } else {
              const mutatedAChild = iter(node, i, child)
              if (mutatedAChild && node.type === 'root') {
                return processChildren()
              } else if (mutatedAChild) {
                return mutatedAChild
              }
            }
          }
        }
        return false
      } else {
        return false
      }
    }
    return processChildren()
  }

  iter(null, 0, { type: 'root', children: mutatedSlate })

  if (isEqual(mutatedSlate, slate)) {
    return slate
  } else {
    return mutatedSlate
  }
}

const applyAllSlateFixes = (slate) => {
    return fixParentingInSlate(
        removeNullTextPropertiesInText(
            defaultMissingURLsInLinksLackingAURL(
                slate
            )
        )
    )
}

/**
 * Look at all the plotline and project templates data objects that
 * might contain RCE data (scene cards, notes, places).
 *
 * If any of the RCE data is invalid, fix it.
 *
 * PRECONDITIONS:
 *  - This script expects to be run from the root of the repository.
 */
const main = () => {
    console.log('Working on Plotline templates...')
    fs.readdirSync(PLOTLINE_TEMPLATES_DIRECTORY).forEach((entry) => {
        console.log(' > ' + entry)
        if (path.extname(entry) === '.json') {
            const filePath = path.join(PLOTLINE_TEMPLATES_DIRECTORY, entry)
            const fileJSON = JSON.parse(fs.readFileSync(filePath).toString('utf-8'))
            const customAttributes = fileJSON.customAttributes ?? {
                characters: [],
                places: [],
                scenes: [],
                lines: [],
                notes: [],
            }
            fileJSON.templateData.cards.forEach((card) => {
                if (Array.isArray(card.description)) {
                    card.description = applyAllSlateFixes(card.description)
                }
                for (const attribute of customAttributes.scenes) {
                    if (attribute.type === 'paragraph') {
                        card[attribute.name] = applyAllSlateFixes(card[attribute.name])
                    }
                }
            })
            fs.writeFileSync(filePath, JSON.stringify(fileJSON, null, 2) + '\n')
        }
    })
    console.log('Working on project templates...')
    fs.readdirSync(PROJECT_TEMPLATES_DIRECTORY).forEach((entry) => {
        console.log(' > ' + entry)
        if (path.extname(entry) === '.json') {
            const filePath = path.join(PROJECT_TEMPLATES_DIRECTORY, entry)
            const fileJSON = JSON.parse(fs.readFileSync(filePath).toString('utf-8'))
            const customAttributes = fileJSON.customAttributes ?? {
                characters: [],
                places: [],
                scenes: [],
                lines: [],
                notes: [],
            }
            fileJSON.templateData.cards.forEach((card) => {
                if (Array.isArray(card.description)) {
                    card.description = applyAllSlateFixes(card.description)
                }
                for (const attribute of customAttributes.scenes) {
                    if (attribute.type === 'paragraph') {
                        card[attribute.name] = applyAllSlateFixes(card[attribute.name])
                    }
                }
            })
            if (fileJSON.templateData.notes) {
                
                fileJSON.templateData.notes.forEach((note) => {
                    if (Array.isArray(note.content)) {
                        note.content = applyAllSlateFixes(note.content)
                    }
                    for (const attribute of customAttributes.notes) {
                        if (attribute.type === 'paragraph') {
                            note[attribute.name] = applyAllSlateFixes(note[attribute.name])
                        }
                    }
                })
            }
            if (fileJSON.templateData.places) {
                fileJSON.templateData.places.forEach((place) => {
                    if (Array.isArray(place.notes)) {
                        place.content = applyAllSlateFixes(place.notes)
                    }
                    for (const attribute of customAttributes.places) {
                        if (attribute.type === 'paragraph') {
                            place[attribute.name] = applyAllSlateFixes(place[attribute.name])
                        }
                    }
                })
            }
            fs.writeFileSync(filePath, JSON.stringify(fileJSON, null, 2) + '\n')
        }
    })
}

main()
