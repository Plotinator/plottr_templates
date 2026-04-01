/**
 * NOTE(ed): This script looks for all of the templates in the
 * templates repo.  By convention, the templates are files with the
 * extension "json" and can be found in the following folders:
 *  - v2/characters
 *  - v2/plotlines
 *  - v2/project
 *  - v2/scenes
 *
 * It then constructs a templates file which is a record mapping the
 * id of each template to its corresponding template, and gzips this
 * file.  It saves the gzipped file in the root of this repository in
 * a file called `templates.json.gz`.
 *
 * PRECONDITIONS:
 *  - This script expects to be run from the root of the repository.
 */

const fs = require('fs')
const path = require('path')
const AdmZip = require('adm-zip')

const TEMPLATE_DIRECTORIES = [
    'templates/characters',
    'templates/plotlines',
    'templates/project',
    'templates/scenes',
]
const TEMPLATES_FILE = 'templates.json'
const TEMPLATES_FILE_ZIPPED = 'templates.json.gz'

const main = () => {
    const allTemplates = TEMPLATE_DIRECTORIES.flatMap((directory) => {
        return fs.readdirSync(directory).filter((entry) => {
            return path.extname(entry) === '.json'
        }).map((templateFile) => {
            return JSON.parse(fs.readFileSync(path.join(directory, templateFile)).toString('utf-8'))
        })
    }).reduce((acc, next) => {
        return {
            ...acc,
            [next.id]: next,
        }
    }, {})

    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(allTemplates))
    const zip = new AdmZip()
    zip.addLocalFile(TEMPLATES_FILE)
    zip.writeZip(TEMPLATES_FILE_ZIPPED)
    console.log('Done!')
}

main()
