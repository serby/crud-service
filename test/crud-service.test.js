const crudService = require('..')
const createSave = require('save')
const emptyFn = () => {}
const required = require('validity-required')
const schemata = require('schemata')
const stream = require('stream')

const fixtures = {
  contact: {
    name: 'Paul',
    email: 'paul@serby.net',
    mobile: null,
    comments: []
  }
}

function createContactCrudService (ignoreTagForSubSchema) {
  const save = createSave('test', { logger: { info: emptyFn } })

  const subSchema = schemata({
    name: 'Comment',
    properties: {
      thread: {
        type: String,
        tag: [ 'a' ]
      },
      comment: {
        type: String,
        tag: [ 'c' ]
      }
    }
  })

  const schema = schemata({
    name: 'Contact',
    properties: {
      _id: {
        type: String,
        tag: [ 'a', 'b' ]
      },
      name: {
        type: String,
        tag: [ 'a' ],
        validators: [ required ]
      },
      email: {
        type: String,
        tag: [ 'b' ],
        validators: [ required ]
      },
      mobile: {
        type: String,
        tag: [ 'c' ]
      },
      comments: {
        type: schemata.Array(subSchema),
        tag: [ 'a' ]
      }
    }
  })

  const options = { ignoreTagForSubSchema }

  return crudService('Contact', save, schema, options)
}

describe('crud-service', () => {
  describe('create()', () => {
    let service

    beforeEach(() => {
      service = createContactCrudService()
    })

    test('should strip unknown properties', done => {
      service.pre('create', (object, cb) => {
        object.extraneous = 'remove me'
        cb(null, object)
      })

      service.create(
        { name: 'Paul',
          email: 'paul@serby.net'
        }, (error, newObject) => {
          expect(error).toBeFalsy()
          expect(newObject.extraneous).toBeFalsy()
          done()
        })
    })

    test('should emit create', done => {
      service.on('create', obj => {
        expect(obj.name).toBe('Paul Serby')
        done()
      })

      service.create(
        { name: 'Paul Serby',
          email: 'paul@serby.net'
        }, () => {})
    })

    test('should emit create with createOptions', done => {
      service.on('create', (obj, options) => {
        expect(obj.name).toBe('Paul Serby')
        expect(options.test).toBe('Test')
        done()
      })

      service.create(
        { name: 'Paul Serby',
          email: 'paul@serby.net'
        }, { test: 'Test' }, () => {})
    })

    test(
      'should emit create with an empty createOptions if none defined',
      done => {
        service.on('create', (obj, options) => {
          expect(obj.name).toBe('Paul Serby')
          expect(options).toEqual({})
          done()
        })

        service.create(
          { name: 'Paul Serby',
            email: 'paul@serby.net'
          }, () => {})
      }
    )

    describe('options', () => {
      test('should only store and validate tagged options', done => {
        service.create(
          { name: 'Paul',
            email: 'paul@serby.net'
          }, { tag: 'a' }, (error, newObject) => {
            expect(error).toBeFalsy()
            expect(newObject.email).toBeFalsy()
            done()
          })
      })

      test('should validate all properties even with .persist tag is set', done => {
        service.create(
          { name: 'Paul',
            email: 'paul@serby.net'
          }, { persist: 'a' }, error => {
            expect(error.errors).toEqual({ email: 'Email is required' })
            done()
          })
      })

      test('should only store tagged options', done => {
        service.create({
          name: 'Paul',
          email: 'paul@serby.net'
        }, { persist: 'b', validate: 'b' }, (ignoreError, newObject) => {
          expect(newObject.name).toBeFalsy()
          expect(newObject.email).toBeDefined()
          done()
        })
      })

      test(
        'should store sub-schema properties regardless of tag if ignoreTagForSubSchemas is true',
        done => {
          // Set ignoreTagForSubSchema to true
          service = createContactCrudService(true)

          service.create(
            { name: 'Paul',
              email: 'paul@serby.net',
              comments:
              [ { thread: 'My Thread',
                comment: 'My Comment'
              },
              { thread: 'My Thread 2',
                comment: 'My Second Comment'
              }
              ]
            }, { tag: 'a' }, (error, newObject) => {
              expect(error).toBeFalsy()

              expect(newObject.email).toBeFalsy()

              expect(newObject.comments[0].comment).toBe('My Comment')
              expect(newObject.comments[0].thread).toBe('My Thread')
              expect(newObject.comments[1].comment).toBe('My Second Comment')
              expect(newObject.comments[1].thread).toBe('My Thread 2')
              done()
            })
        }
      )

      test(
        'should store sub-schema properties with tag if ignoreTagForSubSchemas is false',
        done => {
          service.create(
            { name: 'Paul',
              email: 'paul@serby.net',
              comments:
              [ { thread: 'My Thread',
                comment: 'My Comment'
              },
              { thread: 'My Thread 2',
                comment: 'My Second Comment'
              }
              ]
            }, { tag: 'a' }, (error, newObject) => {
              expect(error).toBeFalsy()

              expect(newObject.email).toBeFalsy()

              expect(newObject.comments[0].comment).toBeFalsy()
              expect(newObject.comments[0].thread).toBe('My Thread')

              expect(newObject.comments[0].comment).toBeFalsy()
              expect(newObject.comments[1].thread).toBe('My Thread 2')
              done()
            })
        }
      )

      test('should only validate tagged options', done => {
        service.create(
          {}, { validate: 'b' }, error => {
            expect(error.errors).toEqual({ email: 'Email is required' })
            done()
          })
      })

      test('should error when only persist tagged but not validation', done => {
        service.create(
          { name: 'Paul'
          }, { persist: 'c' }, error => {
            expect(error.errors).toEqual({ name: 'Name is required', email: 'Email is required' })
            done()
          })
      })
    })
  })

  describe('read()', () => {
    let service
    let id
    let obj
    beforeEach(done => {
      service = createContactCrudService()
      service.create({
        name: 'Paul',
        email: 'paul@serby.net'
      }, (ignoreError, newObject) => {
        id = newObject._id
        obj = newObject
        done()
      })
    })

    test('should cast id param to correct type', done => {
      service.read(`${id}`, (ignoreError, object) => {
        expect(object).toEqual(obj)
        done()
      })
    })

    test('should strip unknown properties', done => {
      service.pre('create', (object, cb) => {
        object.extraneous = 'remove me'
        cb(null, object)
      })

      service.create(
        { name: 'Paul',
          email: 'paul@serby.net'
        }, (ignoreError, newObject) => {
          service.read(newObject._id, (error, object) => {
            expect(error).toBeFalsy()
            expect(object.extraneous).toBeFalsy()
            done()
          })
        })
    })
  })

  describe('update()', () => {
    let service
    let id

    beforeEach(done => {
      service = createContactCrudService()
      service.pre('update', (object, cb) => {
        object.extraneous = 'remove me'
        cb(null, object)
      })
      service.create(
        { name: 'Paul',
          email: 'paul@serby.net'
        }, (error, newObject) => {
          expect(error).toBeFalsy()
          id = newObject._id
          done()
        })
    })

    test('should strip unknown properties', done => {
      service.update(
        { name: 'Paul Serby',
          email: 'paul@serby.net',
          _id: id
        }, {}, (error, object) => {
          expect(error).toBeFalsy()
          expect(object.extraneous).toBeFalsy()
          done()
        })
    })

    test('should emit update', done => {
      service.on('update', obj => {
        expect(obj.name).toBe('Paul Serby')
        done()
      })

      service.update(
        { name: 'Paul Serby',
          email: 'paul@serby.net',
          _id: id
        }, {}, () => {})
    })

    test('should emit update with updateOptions', done => {
      service.on('update', (obj, options) => {
        expect(obj.name).toBe('Paul Serby')
        expect(options.test).toBe('Test')
        done()
      })

      service.update(
        { name: 'Paul Serby',
          email: 'paul@serby.net',
          _id: id
        }, { test: 'Test' }, () => {})
    })

    test(
      'should emit update with an empty updateOptions if none defined',
      done => {
        service.on('update', (obj, options) => {
          expect(obj.name).toBe('Paul Serby')
          expect(options).toEqual({})
          done()
        })

        service.update(
          { name: 'Paul Serby',
            email: 'paul@serby.net',
            _id: id
          }, () => {})
      }
    )

    test('should use callback when no options are set', done => {
      service.update(
        { name: 'Paul Serby',
          email: 'paul@serby.net',
          _id: id
        }, () => {
          done()
        })
    })

    describe('options', () => {
      test('should only store and validate tagged options', done => {
        service.update(
          { _id: id,
            name: 'Paul',
            email: 'Foo'
          }, { tag: 'a' }, (error, newObject) => {
            expect(error).toBeFalsy()
            expect(newObject.email).toBe('paul@serby.net')
            done()
          })
      })

      test('should validate all properties even with .persist tag is set', done => {
        service.update(
          { _id: id,
            name: 'Paul',
            email: 'paul@serby.net'
          }, { persist: 'a' }, error => {
            expect(error.errors).toEqual({ email: 'Email is required' })
            done()
          })
      })

      test('should only store tagged options', done => {
        service.update(
          { _id: id,
            name: 'Paulo',
            email: 'paul@serby.net'
          }, { persist: 'b', validate: 'b' }, (error, newObject) => {
            expect(error).toBeFalsy()
            expect(newObject.name).toEqual('Paul')
            expect(newObject.email).toBeDefined()
            done()
          })
      })

      test(
        'should store sub-schema properties regardless of tag if ignoreTagForSubSchemas is true',
        done => {
          // Set ignoreTagForSubSchema to true and set up initial object
          service = createContactCrudService(true)
          service.pre('update', (object, cb) => {
            object.extraneous = 'remove me'
            cb(null, object)
          })

          service.create(
            { name: 'Paul',
              email: 'paul@serby.net'
            }, (error, newObject) => {
              expect(error).toBeFalsy()
              id = newObject._id

              service.update(
                { _id: id,
                  name: 'Paul',
                  email: 'foo',
                  comments:
                  [ { thread: 'My Thread Updated',
                    comment: 'My Comment Updated'
                  },
                  { thread: 'My Thread 2 Updated',
                    comment: 'My Second Comment Updated'
                  }
                  ]
                }, { tag: 'a', ignoreTagForSubSchema: true }, (error, newObject) => {
                  expect(error).toBeFalsy()

                  expect(newObject.email).toBe('paul@serby.net')

                  expect(newObject.comments[0].comment).toBe('My Comment Updated')
                  expect(newObject.comments[0].thread).toBe('My Thread Updated')
                  expect(newObject.comments[1].comment).toBe('My Second Comment Updated')
                  expect(newObject.comments[1].thread).toBe('My Thread 2 Updated')
                  done()
                })
            })
        }
      )

      test(
        'should store sub-schema properties with tag if ignoreTagForSubSchemas is false',
        done => {
          service.update(
            { _id: id,
              name: 'Paul',
              email: 'foo',
              comments:
              [ { thread: 'My Thread Updated',
                comment: 'My Comment'
              },
              { thread: 'My Thread 2 Updated',
                comment: 'My Second Comment'
              }
              ]
            }, { tag: 'a', ignoreTagForSubSchema: false }, (error, newObject) => {
              expect(error).toBeFalsy()

              expect(newObject.email).toBe('paul@serby.net')

              expect(newObject.comments[0].comment).toBeFalsy()
              expect(newObject.comments[0].thread).toBe('My Thread Updated')

              expect(newObject.comments[0].comment).toBeFalsy()
              expect(newObject.comments[1].thread).toBe('My Thread 2 Updated')
              done()
            })
        }
      )

      test('should only validate tagged options', done => {
        service.create(
          {}, { validate: 'b' }, error => {
            expect(error.errors).toEqual({ email: 'Email is required' })
            done()
          })
      })

      test('should error when only persist tagged but not validation', done => {
        service.create(
          { name: 'Paul'
          }, { persist: 'c' }, error => {
            expect(error.errors).toEqual({ name: 'Name is required', email: 'Email is required' })
            done()
          })
      })
    })
  })

  describe('partialUpdate()', () => {
    let service
    let id
    beforeEach(done => {
      service = createContactCrudService()
      service.create({ name: 'Paul', email: 'paul@serby.net' }, (error, newObject) => {
        expect(error).toBeFalsy()
        id = newObject._id
        done()
      })
    })

    test('should only update part of object', done => {
      const partial = { _id: id, name: 'Serby' }

      service.partialUpdate(partial, (error, updatedObject) => {
        expect(error).toBeFalsy()
        expect(updatedObject).toEqual({ ...fixtures.contact, ...partial })
        done()
      })
    })

    test('should throw an error when target can not be found', done => {
      const partial = { _id: 'unknown', email: 'noone@nowhere.net' }

      service.partialUpdate(partial, error => {
        expect(error.message).toEqual(`Couldn't find object with an _id of ${partial._id}`)
        done()
      })
    })

    test('should be preprocessed', done => {
      const partial = { _id: id, name: 'Serby' }
      service.pre('partialUpdate', (input, callback) => {
        input.name = input.name.toUpperCase()
        callback(null, input)
      })
      service.partialUpdate(partial, (error, updatedObject) => {
        expect(error).toBeFalsy()
        expect(updatedObject).toEqual({ ...fixtures.contact, ...partial, ...{ name: 'SERBY' } })
        done()
      })
    })

    test('should strip unknown properties', done => {
      service.pre('partialUpdate', (object, cb) => {
        object.extraneous = 'remove me'
        cb(null, object)
      })

      service.partialUpdate(
        { name: 'Paul Serby',
          _id: id
        }, {}, (error, object) => {
          expect(error).toBeFalsy()
          expect(object.extraneous).toBeFalsy()
          done()
        })
    })

    test('should emit partialUpdate', done => {
      service.on('partialUpdate', obj => {
        expect(obj.name).toBe('Paul Serby')
        done()
      })

      service.partialUpdate(
        { name: 'Paul Serby',
          _id: id
        }, {}, (error, object) => {
          expect(error).toBeFalsy()
          expect(object.extraneous).toBeFalsy()
        })
    })

    test('should emit partialUpdate with original object', done => {
      service.on('partialUpdate', (obj, originalObj) => {
        expect(obj.name).toBe('Paul Serby')
        expect(originalObj.name).toBe('Paul')
        done()
      })

      service.partialUpdate(
        { name: 'Paul Serby',
          email: 'paul@serby.net',
          _id: id
        }, () => {})
    })

    test('should emit partialUpdate with updateOptions', done => {
      service.on('partialUpdate', (obj, originalObj, options) => {
        expect(obj.name).toBe('Paul Serby')
        expect(options.test).toBe('Test')
        done()
      })

      service.partialUpdate(
        { name: 'Paul Serby',
          email: 'paul@serby.net',
          _id: id
        }, { test: 'Test' }, () => {})
    })
  })

  describe('delete()', () => {
    test('should')
  })

  describe('deleteMany()', () => {
    test('should')
  })

  describe('find()', () => {
    test('should strip unknown properties', done => {
      const service = createContactCrudService()

      service.pre('create', (object, cb) => {
        object.extraneous = 'remove me'
        cb(null, object)
      })

      service.create(
        { name: 'Paul',
          email: 'paul@serby.net'
        }, () => {
          service.create(
            { name: 'Ben',
              email: 'bn@grly.me'
            }, (error, contact) => {
              expect(error).toBeFalsy()
              service.find({ name: 'Ben' }, (error, objects) => {
                expect(error).toBeFalsy()
                objects.forEach(object => {
                  expect(object.extraneous).toBeFalsy()
                })
                done()
              })
            })
        })
    })

    test('should strip unknown properties when returned as a stream', done => {
      const service = createContactCrudService()

      service.pre('create', (object, cb) => {
        object.extraneous = 'remove me'
        cb(null, object)
      })

      service.create(
        { name: 'Paul',
          email: 'paul@serby.net'
        }, () => {
          service.create(
            { name: 'Ben',
              email: 'bn@grly.me'
            }, () => {
              const validateStream = new stream.Transform({ objectMode: true })

              validateStream._transform = (item, encoding, done) => {
                expect(item.extraneous).toBeFalsy()
                done(null, item)
              }

              validateStream.on('finish', done)

              service.find({ name: 'Ben' }).pipe(validateStream)
            })
        })
    })
  })

  describe('count()', () => {
    test('should')
  })

  describe('pre()', () => {
    test('should')
  })
})
