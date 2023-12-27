## Configure MongoDB with replica set

To enable MongoDB with a replica set on your local instance, follow these steps:

1. Shutdown Existing MongoDB Instance:
    * Ensure that your existing MongoDB instance is not running. If it is, shut it down.

2. Modify mongod.conf File:
    * Open your MongoDB configuration file, usually located at /etc/mongod.conf.
    * Add or uncomment the following lines to configure replication:
    ```
        replication:
          replSetName: rs0
          oplogSizeMB: 1024
    ```

3. Start MongoDB Instance:
   * Restart your MongoDB instance to apply the configuration changes.

      ```sudo service mongod restart```

4. Check MongoDB Status:
   * Verify the status of MongoDB and ensure there are no errors.
        ```
        sudo chown -R mongodb:mongodb /var/lib/mongodb
        sudo chown mongodb:mongodb /tmp/mongodb-27017.sock

        sudo service mongod restart
        ```
        
## How to use MongoCDC

Integrate MongoCDC into your project to capture and react to MongoDB operations using Change Data Capture (CDC). Follow the code example below:

```
import MongoCDC from "./index";

const mongoCDC = new MongoCDC("mongodb://127.0.0.1:27017/local", { ns: "databaseName.*" });

// Start listening to oplogs
mongoCDC.listen();

// Event for all oprations
mongoCDC.on('op', (doc) => {
    console.log(JSON.stringify(doc, null, 2));
});

// Event for insert
mongoCDC.on('insert', (doc) => {
    console.log(JSON.stringify(doc, null, 2));
});

// Event for update
mongoCDC.on('update', (doc) => {
    console.log(JSON.stringify(doc, null, 2));
});

// Event for delete
mongoCDC.on('delete', (doc) => {
    console.log(JSON.stringify(doc, null, 2));
});

```

Feel free to customize the **ns** parameter to filter specific database and collection names based on your requirements. The provided example demonstrates the basic usage of **MongoCDC** with event listeners for different MongoDB operations.