/* eslint-disable no-process-exit */
/* eslint-disable unicorn/no-process-exit */
/* eslint-disable indent */
const {Command, flags} = require('@oclif/command')
const fs = require('fs').promises
// const fsCallback = require('fs')

class LwchCommand extends Command {
  async run() {
    const {flags} = this.parse(LwchCommand)

    const name = flags.name

    // defaults below based on behavior of create-lwc-app cli
    const rawPath = flags.path
    const namespace = flags.namespace

    // const isCreatePath = flags.createPath
    const isCreateCSS = flags.useCSS
    const isCreateHTML = !flags.noHTML

    // object structure that contains metadata about all files required
    const fileCreateDefinition = {
      isCreateCSS,
      isCreateHTML,
      name,
    }

    try {
      const modulesDir = await fs.readdir(rawPath)

      // validate if we already have the component dir and exit if we do
      if (modulesDir.includes(namespace)) {
        const namespaceDir = await fs.readdir(`${rawPath}/${namespace}`)
        if (namespaceDir.includes(name)) {
          // if we already have the module name directory, let's not overwrite anything
          this.warn('Component Already Exists. Exiting.')
          process.exit(1)
        }
      }

      fileCreateDefinition.componentPath = `${rawPath}/${namespace}/${name}`
      await fs.mkdir(fileCreateDefinition.componentPath, {recursive: true})
    } catch (error) {
      this.error(error)
    }

    // create data about each file we will create
    const filesToCreate = this.createFilesList(fileCreateDefinition)

    // create an array of promises using array.map and pass to Promise.all to run concurrently
    Promise
      .all(filesToCreate.map(item => fs.writeFile(item.name, item.text)))
      .then(() => {
        this.log(`Successfully Created Component ${namespace}/${name} in ${rawPath}`)
        this.exit()
      })
      .catch(error => {
        this.warn(error)
      })
  }

  // transform into objects that describe filenames and file contents for each required file to pass to file create API
  createFilesList(filesDefinition) {
    // name to classname in upper camelcase
    const className = `${filesDefinition.name[0].toUpperCase()}${filesDefinition.name.slice(1)}`

    const filesToCreate = [
      {
        name: `${filesDefinition.componentPath}/${filesDefinition.name}.js`,
        text: `import { LightningElement } from 'lwc'

export default class ${className} extends LightningElement {
}`,
      },
    ]

    if (filesDefinition.isCreateHTML) {
      filesToCreate.push({
        name: `${filesDefinition.componentPath}/${filesDefinition.name}.html`,
        text: `<template>
  <!-- component template for ${filesDefinition.name} -->
</template>`,
      })
    }

    if (filesDefinition.isCreateCSS) {
      filesToCreate.push({
        name: `${filesDefinition.componentPath}/${filesDefinition.name}.css`,
        text: '',
      })
    }

    return filesToCreate
  }
}

LwchCommand.description = `Command to bootstrap component files for Lightning Web Components OSS

While tooling may be on the way, growing tired of manually adding files for LWC OSS, I've created this command to do just that. Use this to create the namespace directory, the JS file, and optionally the html template and css files.
`

LwchCommand.flags = {
  // add --version flag to show CLI version
  version: flags.version({char: 'v'}),
  // add --help flag to show CLI version
  help: flags.help({char: 'h'}),
  name: flags.string({char: 'n', description: 'Name of the component in camelCase', required: true}),
  path: flags.string({char: 'p', description: 'File path for new component files. Defaults to src/modules based on behavior of create-lwc-app cli. If it does not exist, component creation will fail.', default: 'src/client/modules'}),
  namespace: flags.string({char: 'm', description: 'Namespace (root folder) for component. Defaults to \'my\'.', default: 'my'}),
  useCSS: flags.boolean({char: 's', description: 'Add a .css file for this component.'}),
  createPath: flags.boolean({char: 'r', description: 'Create new namespace path if it doesn\'t exist?', default: true}),
  noHTML: flags.boolean({char: 't', description: 'Skip creation of HTML file where only component module is required.'}),
}

module.exports = LwchCommand
