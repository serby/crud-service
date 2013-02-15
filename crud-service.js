var extend = require('util')._extend
  , Pipe = require('piton-pipe')
  , emptyFn = function () {}
  , events = require('events')

module.exports = function CrudService(name, save, schema, options) {

  var slug = (options && options.slug) ? options.slug : name.toLowerCase().replace(/ /g, '')
    , plural = (options && options.plural) ? options.plural : name + 's'
    , self = new events.EventEmitter()

  var pre = {
    create: Pipe.createPipe(),
    createValidate: Pipe.createPipe(),
    update: Pipe.createPipe(),
    updateValidate: Pipe.createPipe(),
    partialUpdate: Pipe.createPipe(),
    partialValidate: Pipe.createPipe(),
    'delete': Pipe.createPipe()
  }

  if (schema.schema[save.idProperty] === undefined) {
    throw new Error('schema does not have the required property \'' +
      save.idProperty + '\'')
  }

  return extend(self, {
    name: name,
    slug: slug,
    plural: plural,
    schema: schema,
    idProperty: save.idProperty,
    create: function (object, validateOptions, callback) {

      if (typeof validateOptions === 'function') {
        callback = validateOptions
      }

      callback = callback || emptyFn

      var cleanObject = schema.cast(schema.stripUnknownProperties(schema.makeDefault(object), validateOptions.tag))

      pre.createValidate.run(cleanObject, function (error, pipedObject) {
        if (error) {
          return callback(error)
        }
        schema.validate(pipedObject, validateOptions.set, validateOptions.tag, function (error, validationErrors) {
          if (error) {
            return callback(error)
          }
          if (Object.keys(validationErrors).length > 0) {
            var validationError = new Error('Validation Error')
            validationError.errors = validationErrors
            return callback(validationError, pipedObject)
          }
          pre.create.run(pipedObject, function (error, pipedObject) {
            if (error) {
              return callback(error)
            }
            save.create(pipedObject, function (error, savedObject) {
              if (error) {
                return callback(error)
              }
              self.emit('create', savedObject)
              callback(undefined, savedObject)
            })
          })
        })
      })
    },
    read: save.read,
    update: function (object, validateOptions, callback) {
      callback = callback || emptyFn

      var cleanObject = schema.cast(schema.stripUnknownProperties(schema.makeDefault(object), validateOptions.tag))

      pre.updateValidate.run(cleanObject, function (error, pipedObject) {
        if (error) {
          return callback(error)
        }
        schema.validate(pipedObject, validateOptions.set, validateOptions.tag,
          function (error, validationErrors) {
          if (error) {
            return callback(error)
          }
          if (Object.keys(validationErrors).length > 0) {
            var validationError = new Error('Validation Error')
            validationError.errors = validationErrors
            return callback(validationError, pipedObject)
          }
          pre.update.run(pipedObject, function (error, pipedObject) {
            if (error) {
              return callback(error, pipedObject)
            }
            save.update(pipedObject, function (error, savedObject) {
              if (error) {
                return callback(error)
              }
              self.emit('update', savedObject)
              callback(undefined, savedObject)
            })
          })
        })
      })
    },
    partialUpdate: function (object, validateOptions, callback) {
      callback = callback || emptyFn

      if (typeof validateOptions === 'function') {
        callback = validateOptions
      }
      save.read(object[save.idProperty], function (error, readObject) {
        if (error) {
          return callback(error)
        }
        readObject = extend(readObject, object)

        var cleanObject = schema.cast(schema.stripUnknownProperties(readObject, validateOptions.tag))

        pre.partialUpdate.run(cleanObject, function (error, pipedObject) {
          if (error) {
            return callback(error)
          }
          schema.validate(pipedObject, validateOptions.set, validateOptions.tag,
            function (error, validationErrors) {
            if (error) {
              return callback(error)
            }
            if (Object.keys(validationErrors).length > 0) {
              var validationError = new Error('Validation Error')
              validationError.errors = validationErrors
              return callback(validationError, pipedObject)
            }
            pre.partialUpdate.run(pipedObject, function (error, pipedObject) {
              if (error) {
                return callback(error, pipedObject)
              }
              // Now only update the keys the original object had.
              var objectForUpdate = {}
              Object.keys(object).forEach(function (key) {
                objectForUpdate[key] = pipedObject[key]
              })
              save.update(objectForUpdate, function (error, savedObject) {
                if (error) {
                  return callback(error)
                }
                self.emit('partialUpdate', savedObject)
                callback(undefined, savedObject)
              })
            })
          })
        })
      })
    },
    'delete': function (id, callback) {
      save['delete'](id, function (error) {
        if (error) {
          return callback(error)
        }
        self.emit('delete', id)
        if (typeof callback === 'function') callback()
      })
    },
    deleteMany: function (query, callback) {
      save.deleteMany(query, function (error) {
        if (error) {
          return callback(error)
        }
        self.emit('deleteMany', query)
        callback()
      })
    },
    count: save.count,
    find: save.find,
    pre: function (method, processor) {
      return pre[method].add(processor)
    }
  })
}