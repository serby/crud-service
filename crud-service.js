const extend = require('util')._extend;
const Pipe = require('piton-pipe');
const emptyFn = () => {};
const events = require('events');
const stream = require('stream');

module.exports = function CrudService(name, save, schema, options) {
  const slug = (options && options.slug) ? options.slug : name.toLowerCase().replace(/ /g, '');
  const plural = (options && options.plural) ? options.plural : `${name}s`;
  const self = new events.EventEmitter();
  const ignoreTagForSubSchema = (options && options.ignoreTagForSubSchema) ? options.ignoreTagForSubSchema : false;

  const pre = {
    create: Pipe.createPipe(),
    createValidate: Pipe.createPipe(),
    update: Pipe.createPipe(),
    updateValidate: Pipe.createPipe(),
    partialUpdate: Pipe.createPipe(),
    partialValidate: Pipe.createPipe(),
    'delete': Pipe.createPipe()
  };

  if (schema.schema[save.idProperty] === undefined) {
    throw new Error(`schema does not have the required property '${save.idProperty}'`)
  }

  return extend(self, {
    name,
    slug,
    plural,
    schema,
    idProperty: save.idProperty,
    idType: save.idType,
    create(object, createOptions, callback) {

      if (typeof createOptions === 'function') {
        callback = createOptions
        createOptions = {}
      }

      callback = callback || emptyFn

      const cleanObject = schema.cast(schema.stripUnknownProperties(schema.makeDefault(object), createOptions.persist || createOptions.tag, ignoreTagForSubSchema));

      pre.createValidate.run(cleanObject, (error, pipedObject) => {
        if (error) {
          return callback(error)
        }
        schema.validate(pipedObject, createOptions.set, createOptions.validate || createOptions.tag, (error, validationErrors) => {
          if (error) {
            return callback(error)
          }
          if (Object.keys(validationErrors).length > 0) {
            const validationError = new Error('Validation Error');
            validationError.errors = validationErrors
            return callback(validationError, pipedObject)
          }
          pre.create.run(pipedObject, (error, pipedObject) => {
            if (error) {
              return callback(error)
            }
            save.create(pipedObject, (error, savedObject) => {
              if (error) {
                return callback(error)
              }
              self.emit('create', savedObject, createOptions)
              callback(undefined, schema.stripUnknownProperties(savedObject))
            })
          })
        })
      })
    },
    read(id, callback) {
      return save.read(schema.castProperty(schema.schema[save.idProperty].type, id), (error, object) => {
        if (error) return callback(error)
        if (!object) return callback(undefined, undefined)
        callback(undefined, schema.stripUnknownProperties(object))
      });
    },
    update(object, updateOptions, callback) {
      if (typeof updateOptions === 'function') {
        callback = updateOptions
        updateOptions = {}
      }

      callback = callback || emptyFn

      const cleanObject = schema.cast(schema.stripUnknownProperties(schema.makeDefault(object), updateOptions.persist || updateOptions.tag, ignoreTagForSubSchema));

      pre.updateValidate.run(cleanObject, (error, pipedObject) => {
        if (error) {
          return callback(error)
        }
        schema.validate(pipedObject, updateOptions.set, updateOptions.validate || updateOptions.tag,
          (error, validationErrors) => {
          if (error) {
            return callback(error)
          }
          if (Object.keys(validationErrors).length > 0) {
            const validationError = new Error('Validation Error');
            validationError.errors = validationErrors
            return callback(validationError, pipedObject)
          }
          pre.update.run(pipedObject, (error, pipedObject) => {
            if (error) {
              return callback(error, pipedObject)
            }
            save.update(pipedObject, (error, savedObject) => {
              if (error) {
                return callback(error)
              }
              self.emit('update', savedObject, updateOptions)
              if (!savedObject) return callback(undefined, undefined)
              callback(undefined, schema.stripUnknownProperties(savedObject))
            })
          })
        })
      })
    },
    partialUpdate(object, updateOptions, callback) {
      callback = callback || emptyFn

      if (typeof updateOptions === 'function') {
        callback = updateOptions
        updateOptions = {}
      }

      if (!object[save.idProperty]) {
        return callback(new Error(`object have not ID property '${save.idProperty}'`));
      }

      save.read(object[save.idProperty], (error, readObject) => {
        if (error) {
          return callback(error)
        }

        if (typeof readObject === 'undefined') {
          return callback(new Error(`Couldn't find object with an ${save.idProperty} of ${object[save.idProperty]}`));
        }

        // extend overrides the original object, the original readObject is still needed
        const readObjectCloned = extend({}, readObject);

        const updatedObject = extend(readObjectCloned, object);
        const cleanObject = schema.cast(schema.stripUnknownProperties(updatedObject, updateOptions.persist || updateOptions.tag));

        pre.partialValidate.run(cleanObject, (error, pipedObject) => {
          if (error) {
            return callback(error)
          }
          schema.validate(pipedObject, updateOptions.set, updateOptions.validate || updateOptions.tag,
            (error, validationErrors) => {
            if (error) {
              return callback(error)
            }
            if (Object.keys(validationErrors).length > 0) {
              const validationError = new Error('Validation Error');
              validationError.errors = validationErrors
              return callback(validationError, pipedObject)
            }
            // Now only update the keys the original object had.
            const objectForUpdate = {};
            Object.keys(object).forEach(key => {
              objectForUpdate[key] = pipedObject[key]
            })
            pre.partialUpdate.run(objectForUpdate, (error, pipedObject) => {
              if (error) {
                return callback(error, pipedObject)
              }
              save.update(objectForUpdate, (error, savedObject) => {
                if (error) {
                  return callback(error)
                }
                self.emit('partialUpdate', savedObject, readObject, updateOptions)
                if (!savedObject) return callback(undefined, undefined)
                callback(undefined, schema.stripUnknownProperties(savedObject))
              })
            })
          })
        })
      })
    },
    'delete': function (id, deleteOptions, callback) {
      if (typeof deleteOptions === 'function') {
        callback = deleteOptions
        deleteOptions = {}
      }

      save['delete'](id, error => {
        if (error) {
          return callback(error)
        }
        self.emit('delete', id, deleteOptions)
        if (typeof callback === 'function') callback()
      })
    },
    deleteMany(query, callback) {
      save.deleteMany(query, error => {
        if (error) {
          return callback(error)
        }
        self.emit('deleteMany', query)
        callback()
      })
    },
    count: save.count,
    find(query, options, callback) {
      if (typeof options === 'function') {
        callback = options
        options = {}
      }

      if (typeof callback === 'undefined') {
        // user requested a stream
        const stripPropertiesStream = new stream.Transform({ objectMode: true });

        stripPropertiesStream._transform = (item, encoding, done) => {
          done(null, schema.stripUnknownProperties(item))
        }

        return save.find.call(save, query, options).pipe(stripPropertiesStream)
      }

      save.find.call(save, query, options, (error, objects) => {
        if (error) return callback(error)
        if (!objects.length) return callback(undefined, objects)
        callback(undefined, objects.map(object => schema.stripUnknownProperties(object)))
      })
    },
    pre(method, processor) {
      return pre[method].add(processor)
    }
  });
}
