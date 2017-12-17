
const { waterfall } = require('async')
const events = require('events')
const stream = require('stream')
const clone = require('lodash.clone')
const emptyFn = () => {}

const pipe = (pipeFns, initialValue, cb) => {
  const passThrough = callback => callback(null, initialValue)
  let fns
  if (pipeFns.size > 0) {
    fns = [ passThrough, ...pipeFns ]
  } else {
    fns = [ passThrough ]
  }
  waterfall(fns, cb)
}

module.exports = (name, save, schema, options) => {
  const slug = (options && options.slug) ? options.slug : name.toLowerCase().replace(/ /g, '')
  const plural = (options && options.plural) ? options.plural : `${name}s`
  const properties = schema.getProperties()
  const self = new events.EventEmitter()
  const ignoreTagForSubSchema = (options && options.ignoreTagForSubSchema) ? options.ignoreTagForSubSchema : false

  const pre = {
    create: new Set(),
    createValidate: new Set(),
    update: new Set(),
    updateValidate: new Set(),
    partialUpdate: new Set(),
    partialValidate: new Set(),
    delete: new Set()
  }

  if (!properties[save.idProperty]) {
    throw new Error(`schema does not have the required property '${save.idProperty}'`)
  }

  return {
    on: self.on.bind(self),
    emit: self.emit.bind(self),
    name,
    slug,
    plural,
    schema,
    idProperty: save.idProperty,
    idType: save.idType,
    create (object, createOptions, callback) {
      if (typeof createOptions === 'function') {
        callback = createOptions
        createOptions = {}
      }

      callback = callback || emptyFn

      const cleanObject = schema.cast(schema.stripUnknownProperties(schema.makeDefault(object), createOptions.persist || createOptions.tag, ignoreTagForSubSchema))

      pipe(pre.createValidate, cleanObject, (error, pipedObject) => {
        if (error) return callback(error)
        schema.validate(pipedObject, createOptions.set, createOptions.validate || createOptions.tag, (error, validationErrors) => {
          if (error) return callback(error)
          if (Object.keys(validationErrors).length > 0) {
            const validationError = new Error('Validation Error')
            validationError.errors = validationErrors
            return callback(validationError, pipedObject)
          }
          pipe(pre.create, pipedObject, (error, pipedObject) => {
            if (error) return callback(error)
            save.create(pipedObject, (error, savedObject) => {
              if (error) return callback(error)
              self.emit('create', savedObject, createOptions)
              callback(null, schema.stripUnknownProperties(savedObject))
            })
          })
        })
      })
    },
    read (id, callback) {
      return save.read(schema.castProperty(properties[save.idProperty].type, id), (error, object) => {
        if (error) return callback(error)
        if (!object) return callback(null, undefined)
        callback(null, schema.stripUnknownProperties(object))
      })
    },
    update (object, updateOptions, callback) {
      if (typeof updateOptions === 'function') {
        callback = updateOptions
        updateOptions = {}
      }

      callback = callback || emptyFn

      const cleanObject = schema.cast(schema.stripUnknownProperties(schema.makeDefault(object), updateOptions.persist || updateOptions.tag, ignoreTagForSubSchema))

      pipe(pre.updateValidate, cleanObject, (error, pipedObject) => {
        if (error) return callback(error)
        schema.validate(pipedObject, updateOptions.set, updateOptions.validate || updateOptions.tag,
          (error, validationErrors) => {
            if (error) return callback(error)
            if (Object.keys(validationErrors).length > 0) {
              const validationError = new Error('Validation Error')
              validationError.errors = validationErrors
              return callback(validationError, pipedObject)
            }
            pipe(pre.update, pipedObject, (error, pipedObject) => {
              if (error) return callback(error, pipedObject)
              save.update(pipedObject, (error, savedObject) => {
                if (error) return callback(error)
                self.emit('update', savedObject, updateOptions)
                if (!savedObject) return callback(null, undefined)
                callback(null, schema.stripUnknownProperties(savedObject))
              })
            })
          })
      })
    },
    partialUpdate (object, updateOptions, callback) {
      callback = callback || emptyFn

      if (typeof updateOptions === 'function') {
        callback = updateOptions
        updateOptions = {}
      }

      if (!object[save.idProperty]) {
        return callback(new Error(`object have not ID property '${save.idProperty}'`))
      }

      save.read(object[save.idProperty], (error, readObject) => {
        if (error) return callback(error)

        if (typeof readObject === 'undefined') {
          return callback(new Error(`Couldn't find object with an ${save.idProperty} of ${object[save.idProperty]}`))
        }

        // extend overrides the original object, the original readObject is still needed
        const updatedObject = { ...clone(readObject), ...clone(object) }
        const cleanObject = schema.cast(schema.stripUnknownProperties(updatedObject, updateOptions.persist || updateOptions.tag))
        pipe(pre.partialValidate, cleanObject, (error, pipedObject) => {
          if (error) return callback(error)
          schema.validate(pipedObject, updateOptions.set, updateOptions.validate || updateOptions.tag,
            (error, validationErrors) => {
              if (error) return callback(error)
              if (Object.keys(validationErrors).length > 0) {
                const validationError = new Error('Validation Error')
                validationError.errors = validationErrors
                return callback(validationError, pipedObject)
              }
              // Now only update the keys the original object had.
              const objectForUpdate = {}
              Object.keys(object).forEach(key => {
                objectForUpdate[key] = pipedObject[key]
              })
              pipe(pre.partialUpdate, objectForUpdate, (error, partialUpdatePipedObject) => {
                if (error) return callback(error, partialUpdatePipedObject)
                save.update(partialUpdatePipedObject, (error, savedObject) => {
                  if (error) return callback(error)
                  self.emit('partialUpdate', savedObject, readObject, updateOptions)
                  if (!savedObject) return callback(null, undefined)
                  callback(null, schema.stripUnknownProperties(savedObject))
                })
              })
            })
        })
      })
    },
    delete (id, deleteOptions, callback) {
      if (typeof deleteOptions === 'function') {
        callback = deleteOptions
        deleteOptions = {}
      }

      save.delete(id, error => {
        if (error) return callback(error)
        self.emit('delete', id, deleteOptions)
        if (typeof callback === 'function') callback()
      })
    },
    deleteMany (query, callback) {
      save.deleteMany(query, error => {
        if (error) return callback(error)
        self.emit('deleteMany', query)
        callback()
      })
    },
    count: save.count,
    find (query, options, callback) {
      if (typeof options === 'function') {
        callback = options
        options = {}
      }

      if (typeof callback === 'undefined') {
        // user requested a stream
        const stripPropertiesStream = new stream.Transform({ objectMode: true })

        stripPropertiesStream._transform = (item, encoding, done) => {
          done(null, schema.stripUnknownProperties(item))
        }

        return save.find(query, options).pipe(stripPropertiesStream)
      }
      save.find(query, options, (error, objects) => {
        if (error) return callback(error)
        if (!objects.length) return callback(null, objects)
        callback(null, objects.map(object => schema.stripUnknownProperties(object)))
      })
    },
    pre (method, processor) {
      return pre[method].add(processor)
    }
  }
}
