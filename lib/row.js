// Generated by CoffeeScript 1.4.0
var Row, Table, utils;

utils = require("./hbase-utils");

Table = require("./hbase-table");

/*
Row operations: CRUD operation on rows and columns
==================================================

Row objects provide access and multipulation on colunns and rows. Single and multiple operations are available and are documented below.

Grab an instance of "Row"
-------------------------

```javascript
var myRow = hbase({}).getRow('my_table','my_row');
```

Or

```javascript
var myRow = hbase({}).getTable('my_table').getRow('my_row');
```

Or

```javascript
var client = new hbase.Client({});
var myRow = new hbase.Row(client, 'my_table', 'my_row');
```
*/


Row = function(client, table, key) {
  this.client = client;
  this.table = (typeof table === "string" ? table : table.name);
  return this.key = key;
};

/*
Retrieve values from HBase
--------------------------

```javascript
myRow.get([column], [options], [callback]);
```

Column is optional and corresponds to a column family optionnally followed by a column name separated with a column (":").

An optional object of options may contains the following properties:

-   start: timestamp indicating the minimal version date
-   end: timestamp indicating the maximal version date
-   v: maximum number of returned versions

Callback is required and receive two arguments, an error object if any and the column value.

```javascript
hbase()
.getRow('my_table','my_row')
.get('my_column_family', {from: 1285942515900}, function(error, value){
  console.log(value);
});
```

Print something like

```json
[ { column: 'my_column_family:'
  , timestamp: 1285942722246
  , '$': 'my value 1'
  }
, { column: 'my_column_family:'
  , timestamp: 1285942705504
  , '$': 'my value 2'
  }
, { column: 'my_column_family:my_column'
  , timestamp: 1285942515955
  , '$': 'my value 3'
  }
]
```

Attempting to retrieve a column which does not exist in HBase will return a null value and an error whose code property is set to 404.

```javascript
hbase()
.getRow('my_table','my_row')
.get('my_column_family:my_column', function(error, value){
  assert.strictEqual(404, error.code);
  assert.strictEqual(null, value);
});
```

Retrieve values from multiple rows
----------------------------------

Values from multiple rows is achieved by appending a suffix glob on the row key. Note the new "key" property present in the returned objects.

```javascript
hbase()
.getRow('my_table','my_key_*')
.get('my_column_family:my_column', function(error, value){
  console.log(value);
});
```

Print something like

```javascript
[ { key: 'my_key_1',
  , column: 'my_column_family:my_column'
  , timestamp: 1285942781739
  , '$': 'my value 1'
  }
, { key: 'my_key_2',
  , column: 'my_column_family:my_column'
  , timestamp: 12859425923984
  , '$': 'my value 2'
  }
]
```
*/


Row.prototype.get = function(column, callback) {
  var args, columns, end, isGlob, key, options, params, self, start, url;
  self = this;
  args = Array.prototype.slice.call(arguments);
  key = "/" + this.table + "/" + this.key;
  isGlob = this.key.substr(-1, 1) === "*";
  options = {};
  columns = null;
  start = null;
  end = null;
  params = {};
  if (typeof args[0] === "string" || (typeof args[0] === "object" && args[0] instanceof Array)) {
    columns = args.shift();
  }
  if (typeof args[0] === "object") {
    options = args.shift();
  }
  if (options.start) {
    start = options.start;
  }
  if (options.end) {
    end = options.end;
  }
  if (options.v) {
    params.v = options.v;
  }
  url = utils.url.encode(this.table, this.key, columns, start, end, params);
  return this.client.connection.get(url, function(error, data) {
    var cells;
    if (error) {
      return args[0].apply(self, [error, null]);
    }
    cells = [];
    data.Row.forEach(function(row) {
      key = utils.base64.decode(row.key);
      return row.Cell.forEach(function(cell) {
        data = {};
        if (isGlob) {
          data.key = key;
        }
        data.column = utils.base64.decode(cell.column);
        data.timestamp = cell.timestamp;
        data.$ = utils.base64.decode(cell.$);
        return cells.push(data);
      });
    });
    return args[0].apply(self, [null, cells]);
  });
};

/*
Insert and update a column value
--------------------------------

```javascript
myRow.put(column, data, [timestamp], [callback]);
```

Column is required and corresponds to a column family optionnally followed by a column name separated with a column (":").

Callback is optional and receive two arguments, an error object if any and a boolean indicating whether the column was inserted/updated or not.

```javascript
hbase()
.getRow('my_table', 'my_row')
.put('my_column_family:my_column', 'my value', function(error, success){
  assert.strictEqual(true, success);
});
```

Insert and update multiple column values
----------------------------------------

```javascript
myRow.put(columns, values, [timestamps], [callback]);
myRow.put(data, [callback]);
```

Inserting values into multiple columns is achieved the same way as for a single column but the column and data arguments must be an array of the same length.

```javascript
hbase()
.getRow('my_table', 'my_row')
.put(
  ['my_column_family:my_column_1', 'my_column_family:my_column_2'], 
  ['my value 1', 'my value 2'], 
  function(error, success){
    assert.strictEqual(true, success);
  }
);
```

Alternatively, you could provide an array of cells as below:

```javascript
var cells = 
  [ { column: 'cf:c1', timestamp: Date.now(), $: 'my value' }
  , { column: 'cf:c2', timestamp: Date.now(), $: 'my value' }
  , { column: 'cf:c1', timestamp: Date.now()+1, $: 'my value' }
  ];
hbase()
.getRow('my_table', 'my_row')
.put(cells, function(error, success){
  assert.strictEqual(true, success);
});
```

Insert and update multiple rows
-------------------------------

```javascript
myRow.put(data, [callback]);
```

HBase allows us to send multiple cells from multiple rows in batch. To achieve it, construct a new row with a null key and provide the `put` function with an array of cells. Each cell objects must include the row `key`, `column` and `$` properties while `timestamp` is optional.

```javascript
var rows = 
  [ { key: 'row_1', column: 'cf:c1', timestamp: Date.now(), $: 'my value' }
  , { key: 'row_1', column: 'cf:c2', timestamp: Date.now(), $: 'my value' }
  , { key: 'row_2', column: 'cf:c1', timestamp: Date.now()+1, $: 'my value' }
  ];
hbase()
.getRow('my_table', null)
.put(rows, function(error,success){
  assert.strictEqual(true, success);
});
```
*/


Row.prototype.put = function(columns, values, callback) {
  var args, body, bodyCell, bodyRow, cell, cells, cellsKeys, data, k, k1, self, timestamps, url;
  self = this;
  args = Array.prototype.slice.call(arguments);
  url = void 0;
  body = void 0;
  bodyRow = void 0;
  if (args.length > 2) {
    columns = args.shift();
    values = args.shift();
    timestamps = void 0;
    if (typeof args[0] !== "function") {
      timestamps = args.shift();
    }
    callback = args.shift();
    if (typeof columns === "string") {
      columns = [columns];
      values = [values];
    } else {
      if (columns.length !== values.length) {
        throw new Error("Columns count must match values count");
      }
    }
    body = {
      Row: []
    };
    bodyRow = {
      key: utils.base64.encode(self.key),
      Cell: []
    };
    columns.forEach(function(column, i) {
      var bodyCell;
      bodyCell = {};
      if (timestamps) {
        bodyCell.timestamp = timestamps[i];
      }
      bodyCell.column = utils.base64.encode(column);
      bodyCell.$ = utils.base64.encode(values[i]);
      return bodyRow.Cell.push(bodyCell);
    });
    body.Row.push(bodyRow);
    url = utils.url.encode(this.table, this.key || "___false-row-key___", columns);
  } else {
    data = args.shift();
    callback = args.shift();
    body = {
      Row: []
    };
    cellsKeys = {};
    data.forEach(function(d) {
      var key;
      key = d.key || self.key;
      if (!(key in cellsKeys)) {
        cellsKeys[key] = [];
      }
      return cellsKeys[key].push(d);
    });
    for (k in cellsKeys) {
      cells = cellsKeys[k];
      bodyRow = {
        key: utils.base64.encode(k),
        Cell: []
      };
      for (k1 in cells) {
        cell = cells[k1];
        bodyCell = {};
        if (cell.timestamp) {
          bodyCell.timestamp = "" + cell.timestamp;
        }
        bodyCell.column = utils.base64.encode(cell.column);
        bodyCell.$ = utils.base64.encode(cell.$);
        bodyRow.Cell.push(bodyCell);
      }
      body.Row.push(bodyRow);
    }
    url = utils.url.encode(this.table, this.key || "___false-row-key___");
  }
  return this.client.connection.put(url, body, function(error, data) {
    if (!callback) {
      return;
    }
    return callback.apply(self, [error, (error ? null : true)]);
  });
};

/*
Test if a row or a column exists
--------------------------------

```javascript
myRow.exists([column], [callback]);
```

Column is optional and corresponds to a column family optionnally followed by a column name separated with a column (":").

Callback is required and receive two arguments, an error object if any and a boolean indicating whether the column exists or not.

Example to see if a row exists:

```javascript
hbase()
.getRow('my_table','my_row')
.exists(function(error, exists){
  assert.strictEqual(true, exists);
});
```

Example to see if a column exists:

```javascript
hbase()
.getRow('my_table','my_row')
.exists('my_column_family:my_column', function(error, exists){
  assert.strictEqual(true, exists);
});
```
*/


Row.prototype.exists = function(column, callback) {
  var args, self, url;
  self = this;
  args = Array.prototype.slice.call(arguments);
  column = (typeof args[0] === "string" ? args.shift() : null);
  url = utils.url.encode(this.table, this.key, column);
  return this.client.connection.get(url, function(error, exists) {
    if (error && (error.code === 404 || error.code === 503)) {
      error = null;
      exists = false;
    }
    return args[0].apply(self, [error, (error ? null : (exists === false ? false : true))]);
  });
};

/*
Delete a row or a column
------------------------

```javascript
myRow.delete([column], [callback]);
```

Column is optional and corresponds to a column family optionnally followed by a column name separated with a column (":").

Callback is required and receive two arguments, an error object if any and a boolean indicating whether the column exists or not.

Example to delete a row:

```javascript
hbase()
.getRow('my_table','my_row')
.delete(function(error, success){
  assert.strictEqual(true, success);
});
```

Example to delete a column:

```javascript
hbase()
.getRow('my_table','my_row')
.delete('my_column_family:my_column', function(error, success){
  assert.strictEqual(true, success);
});
```

Delete multiple columns
-----------------------

Deleting multiple columns is achieved by providing an array of columns as the first argument.

```javascript
hbase()
.getRow('my_table','my_row')
.delete(
  ['my_column_family:my_column_1', 'my_column_family:my_column_2'], 
  function(error, success){
    assert.strictEqual(true, success);
  }
);
```
*/


Row.prototype["delete"] = function() {
  var args, columns, self, url;
  self = this;
  args = Array.prototype.slice.call(arguments);
  columns = void 0;
  if (typeof args[0] === "string" || (typeof args[0] === "object" && args[0] instanceof Array)) {
    columns = args.shift();
  }
  url = utils.url.encode(this.table, this.key, columns);
  return this.client.connection["delete"](url, (function(error, success) {
    return args[0].apply(self, [error, (error ? null : true)]);
  }), true);
};

module.exports = Row;