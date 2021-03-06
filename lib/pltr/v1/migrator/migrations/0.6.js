var { cloneDeep } = require('lodash')

function migrate(data) {
  if (data.file && data.file.version === '0.6.0') return data

  var obj = cloneDeep(data)

  // add version
  obj.file.version = '0.6.0'

  // add tag colors
  obj.tags.forEach((t) => {
    t['color'] = t['color'] || null
  })

  // add colors to places
  obj.places.forEach((p) => {
    p['color'] = p['color'] || null
  })

  // add colors to characters
  obj.characters.forEach((c) => {
    c['color'] = c['color'] || null
  })

  // remove chapters
  delete obj.chapters

  // remove userOptions
  delete obj.userOptions

  return obj
}

module.exports = migrate
