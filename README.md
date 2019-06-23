# crud-service

[![build status](https://travis-ci.org/serby/crud-service.png?branch=master)](http://travis-ci.org/serby/crud-service)

[![NPM](https://nodei.co/npm/crud-service.png)](https://nodei.co/npm/crud-service/) [![Greenkeeper badge](https://badges.greenkeeper.io/serby/crud-service.svg)](https://greenkeeper.io/)

Simple crud service for object definition, validation, basic persistence and collection.


## Installation

    npm install crud-service

## Usage

```js
const createCrudService = require('crud-service')
const save = require('save')
const schema = require('./schema')
const service = createCrudService('things', save('thing'), schema())

// service now has some slightly inflated CRUD functionality:
// .create() .read() .update() .partialUpdate()
// .delete() .deleteMany() .find() .count()
```

## API

### var service = new CrudService(String: propertyName, Save: collection, Schemata: schema, Object, options)

Create a new crud service that stores entites in the provided `collection`. This should be
a [save](https://github.com/serby/save) instance with your preferred engine. A
[schemata](https://github.com/serby/schemata) schema is required for validation

`service` has the following CRUD-y methods:

#### service.create(Object: obj, Object: options, Function: cb)
#### service.read(String: objId, Function: cb)
#### service.update(Object: obj, Object: options, Function: cb)
#### service.partialUpdate(Object: obj, Object: options, Function: cb)
#### service.delete(String: objId, Function: cb)
#### service.deleteMany(Object: query, Function: cb)
#### service.find(Object: query, Object: options, Function: cb)

All `options` arguments are optional.

Omitting `cb` when calling `service.find()` will return a stream.

`service` also has the following method:

#### service.pre(String: hook, Function: processor)

This facilitates a pipeline for object manipulation before certain operations.
`pre()` can be called multiple times for the same `hook` and the processor functions
will be queued up. A processor function has the signature `function (entity, cb) {}`,
and should callback with `cb(err, entity)`.

A simple example is to maintain a `lastUpdated` property on service objects:

```js
const setUpdateTime = (entity, cb) => {
  entity.lastUpdated = new Date()
  cb(null, entity)
}

service.pre('update', setUpdateTime)
service.pre('partialUpdate', setUpdateTime)
```

The available pre hooks are:
- `create` - after validation, just before persistence
- `createValidate` - before validation
- `update` - after validation, just before persistence
- `updateValidate` - before validation
- `partialUpdate` - after validation, just before persistence
- `partialValidate` - before validation
- `delete` - before deletion

## Credits
[Paul Serby](https://github.com/serby/) follow me on twitter [@serby](http://twitter.com/serby)

## License
Licensed under the [ISC](https://opensource.org/licenses/ISC)
