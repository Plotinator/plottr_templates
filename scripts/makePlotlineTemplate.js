const fs = require('fs')
const path = require('path')

const filePath = process.argv[2]
if (!filePath) throw new Error('Need to provide a file')

const data = require(filePath)

let newTemplateData = {
  id: '',
  type: 'plotlines',
  name: '',
  description: '',
  version: '',
  link: '',
  templateData: {}
}

if (data.chapters && data.chapters.length) newTemplateData.templateData.chapters = data.chapters
if (data.cards && data.cards.length) newTemplateData.templateData.cards = data.cards
if (data.lines && data.lines.length) newTemplateData.templateData.lines = data.lines
if (data.notes && data.notes.length) newTemplateData.templateData.notes = data.notes
if (data.tags && data.tags.length) newTemplateData.templateData.tags = data.tags

const newFileName = process.argv[3]
if (!newFileName) throw new Error('Need to give it a name')

const newFilePath = path.resolve(__dirname, '..', 'v2', 'plotlines', newFileName)

fs.writeFile(newFilePath, JSON.stringify(newTemplateData, null, 2), (error) => {
  if (error) console.error(error)
  else console.log('Template Saved')
})
