const fs = require('fs')
const path = require('path')

const { file } = require('./example-plottr-file')

const PLOTLINE_TEMPLATES_DIRECTORY = 'templates/plotlines'
const PROJECT_TEMPLATES_DIRECTORY = 'templates/project'

const EXAMPLE_BEAT = file.beats[1].index[2]
const EXAMPLE_CARD = file.cards[0]
const EXAMPLE_LINE = file.lines[0]
const EXAMPLE_HIERARCHY_LEVEL = file.hierarchyLevels[1][0]
const EXAMPLE_NOTE = file.notes[0]
const EXAMPLE_PLACE = file.places[0]
const EXAMPLE_TAG = file.tags[0]

/**
 * Look at all the custom plotline and project templates data objects
 * (scene cards, notes, places, lines, beats, hierarchy levels, tags,
 * images, categoeries and custom attributes).
 *
 * If any of them lack the expected attributes, add missing attributes
 * to them.
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
            Object.values(fileJSON.templateData.beats).forEach((beatTree) => {
                Object.values(beatTree.index).forEach((beat) => {
                    Object.assign(beat, { ...EXAMPLE_BEAT, ...beat })
                })
            })
            fileJSON.templateData.cards.forEach((card) => {
                Object.assign(card, { ...EXAMPLE_CARD, ...card })
            })
            fileJSON.templateData.lines.forEach((line) => {
                Object.assign(line, { ...EXAMPLE_LINE, ...line })
            })
            Object.values(fileJSON.templateData.hierarchyLevels).forEach((hierarchyLevel) => {
                Object.assign(hierarchyLevel, { ...EXAMPLE_HIERARCHY_LEVEL, ...hierarchyLevel })
            })
            fs.writeFileSync(filePath, JSON.stringify(fileJSON, null, 2))
        }
    })
    console.log('Working on project templates...')
    fs.readdirSync(PROJECT_TEMPLATES_DIRECTORY).forEach((entry) => {
        console.log(' > ' + entry)
        if (path.extname(entry) === '.json') {
            const filePath = path.join(PROJECT_TEMPLATES_DIRECTORY, entry)
            const fileJSON = JSON.parse(fs.readFileSync(filePath).toString('utf-8'))
            Object.values(fileJSON.templateData.beats).forEach((beatTree) => {
                Object.values(beatTree.index).forEach((beat) => {
                    Object.assign(beat, { ...EXAMPLE_BEAT, ...beat })
                })
            })
            fileJSON.templateData.cards.forEach((card) => {
                Object.assign(card, { ...EXAMPLE_CARD, ...card })
            })
            fileJSON.templateData.lines.forEach((line) => {
                Object.assign(line, { ...EXAMPLE_LINE, ...line })
            })
            if (fileJSON.templateData.notes) {
                fileJSON.templateData.notes.forEach((note) => {
                    Object.assign(note, { ...EXAMPLE_NOTE, ...note })
                })
            }
            if (fileJSON.templateData.places) {
                fileJSON.templateData.places.forEach((place) => {
                    Object.assign(place, { ...EXAMPLE_PLACE, ...place })
                })
            }
            if (fileJSON.templateData.tags) {
                fileJSON.templateData.tags.forEach((tag) => {
                    Object.assign(tag, { ...EXAMPLE_TAG, ...tag })
                })
            }
            if (fileJSON.templateData.hierarchyLevels) {
                Object.values(fileJSON.templateData.hierarchyLevels).forEach((hierarchyLevel) => {
                    if (hierarchyLevel[0] || hierarchyLevel[1] || hierarchyLevel[2] || hierarchyLevel[3]) {
                        Object.values(Object.values(fileJSON.templateData.hierarchyLevels)[0]).forEach((actualHierarchyLevel) => {
                            Object.assign(actualHierarchyLevel, { ...EXAMPLE_HIERARCHY_LEVEL, ...actualHierarchyLevel })
                        })
                    } else {
                        Object.assign(hierarchyLevel, { ...EXAMPLE_HIERARCHY_LEVEL, ...hierarchyLevel })
                    }
                })
                // Next, check if we need to move the hierarchy levels
                // into a Plottr project's version.
                if (Object.values(Object.values(fileJSON.templateData.hierarchyLevels))[0] === '0') {
                    fileJSON.templateData.hierarchyLevels = { 1: fileJSON.templateData.hierarchyLevels }
                }
            }
            fs.writeFileSync(filePath, JSON.stringify(fileJSON, null, 2))
        }
    })
}

main()
