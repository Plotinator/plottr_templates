const fs = require('fs')
const { template: { projectFromTemplate } }= require('../pltr-dist')
const readline = require('readline')

const migrateTemplate = (version) => (templatePath) => {
  console.log(`Migrating: ${templatePath}`)
  const template = JSON.parse(fs.readFileSync(templatePath, { encoding: "UTF-8" }))
  return new Promise((resolve, reject) =>
    projectFromTemplate(template, version, '', (error, state) => {
      if (error) {
        reject(error)
        return
      }
      console.log(`Migrated: ${templatePath}`)
      resolve({
        original: template,
        migrated: state,
      })
    })
  )
}

const templatesToMigrate = fs
  .readdirSync('./v2/project/')
  .map((templateName) => `./v2/project/${templateName}`)
  .concat(
    fs
      .readdirSync('./v2/plotlines/')
      .map((templateName) => `./v2/plotlines/${templateName}`))

readline.createInterface({
  input: process.stdin,
  output: process.stdout
}).question(`What version are we migrating to? `, async (version) => {
  const migrate = migrateTemplate(version)
  const results = await Promise.all(templatesToMigrate.map(migrate))
  try {
    results.forEach(({ original, migrated, }, index) => {
      const templatePath = templatesToMigrate[index]
      original.templateData = {
        cards: migrated.cards,
        beats: migrated.beats,
        lines: migrated.lines,
        hierarchyLevels: migrated.hierarchyLevels,
      }
      if (original.type === 'project') {
        original.templateData.customAttributes = migrated.customAttributes
        original.templateData.tags = migrated.tags
        original.templateData.notes = migrated.notes
        original.templateData.images = migrated.images
      }
      original.version = migrated.file.version
      original.initialVersion = migrated.file.initialVersion
      original.appliedMigrations = migrated.file.appliedMigrations
      fs.writeFileSync(templatePath, JSON.stringify(original, null, 2))
      console.log(`Writing migrated template for ${templatePath}`)
    })
  } catch (error) {
    console.error('WARNING!  Something went wrong.  Templates might not have been migrated.', error)
  }
  process.exit()
});
