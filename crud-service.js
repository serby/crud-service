var extend = require('util')._extend
  , Pipe = require('piton-pipe')
  , emptyFn = function () {}
  , events = require('events')

module.exports = function CrudService(name, save, schema, options) {

  var slug = (options && options.slug) ? options.slug : name.toLowerCase().replace(/ /g, '')
    , plural = (options && options.plural) ? options.plural : name + 's'
    , self = new events.EventEmitter()
    , ignoreTagForSubSchema = (options && options.ignoreTagForSubSchema) ? options.ignoreTagForSubSchema : false

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
    idType: save.idType,
    create: function (object, createOptions, callback) {

      if (typeof createOptions === 'function') {
        callback = createOptions
      }

      callback = callback || emptyFn

      var cleanObject = schema.cast(schema.stripUnknownProperties(schema.makeDefault(object), createOptions.persist || createOptions.tag, ignoreTagForSubSchema))

      pre.createValidate.run(cleanObject, function (error, pipedObject) {
        if (error) {
          return callback(error)
        }
        schema.validate(pipedObject, createOptions.set, createOptions.validate || createOptions.tag, function (error, validationErrors) {
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
              callback(undefined, schema.stripUnknownProperties(savedObject))
            })
          })
        })
      })
    },
    read: function (id, callback) {
      return save.read(schema.castProperty(schema.schema[save.idProperty].type, id), function (error, object) {
        if (error) return callback(error)
        if (!object) return callback(undefined, undefined)
        callback(undefined, schema.stripUnknownProperties(object))
      })
    },
    update: function (object, updateOptions, callback) {
      if (typeof updateOptions === 'function') {
        callback = updateOptions
        updateOptions = {}
      }

      callback = callback || emptyFn

      var cleanObject = schema.cast(schema.stripUnknownProperties(schema.makeDefault(object), updateOptions.persist || updateOptions.tag, ignoreTagForSubSchema))

      pre.updateValidate.run(cleanObject, function (error, pipedObject) {
        if (error) {
          return callback(error)
        }
        schema.validate(pipedObject, updateOptions.set, updateOptions.validate || updateOptions.tag,
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
              if (!savedObject) return callback(undefined, undefined)
              callback(undefined, schema.stripUnknownProperties(savedObject))
            })
          })
        })
      })
    },
    partialUpdate: function (object, updateOptions, callback) {
      callback = callback || emptyFn

      if (typeof updateOptions === 'function') {
        callback = updateOptions
      }

      if (!object[save.idProperty]) {
        return callback(new Error('object have not ID property \'' + save.idProperty
          + '\''))
      }

      save.read(object[save.idProperty], function (error, readObject) {
        if (error) {
          return callback(error)
        }

        if (typeof readObject === 'undefined') {
          return callback(new Error('Couldn\'t find object with an ' + save.idProperty + ' of ' + object[save.idProperty]))
        }

        readObject = extend(readObject, object)

        var cleanObject = schema.cast(schema.stripUnknownProperties(readObject, updateOptions.persist || updateOptions.tag))

        pre.partialValidate.run(cleanObject, function (error, pipedObject) {
          if (error) {
            return callback(error)
          }
          schema.validate(pipedObject, updateOptions.set, updateOptions.validate || updateOptions.tag,
            function (error, validationErrors) {
            if (error) {
              return callback(error)
            }
            if (Object.keys(validationErrors).length > 0) {
              var validationError = new Error('Validation Error')
              validationError.errors = validationErrors
              return callback(validationError, pipedObject)
            }
            // Now only update the keys the original object had.
            var objectForUpdate = {}
            Object.keys(object).forEach(function (key) {
              objectForUpdate[key] = pipedObject[key]
            })
            pre.partialUpdate.run(objectForUpdate, function (error, pipedObject) {
              if (error) {
                return callback(error, pipedObject)
              }
              save.update(objectForUpdate, function (error, savedObject) {
                if (error) {
                  return callback(error)
                }
                self.emit('partialUpdate', savedObject)
                if (!savedObject) return callback(undefined, undefined)
                callback(undefined, schema.stripUnknownProperties(savedObject))
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
    find: function (query, options, callback) {
      if (typeof options === 'function') {
        callback = options
        options = {}
      }
      save.find.call(save, query, options, function (error, objects) {
        if (error) return callback(error)
        if (!objects.length) return callback(undefined, objects)
        callback(undefined, objects.map(function (object) {
          return schema.stripUnknownProperties(object)
        }))
      })
    },
    pre: function (method, processor) {
      return pre[method].add(processor)
    }
  })
}