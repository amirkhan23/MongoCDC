import MongoCDC from "./index";

const mongoCDC = new MongoCDC("mongodb://127.0.0.1:27017/local", { ns: "test.*" });

mongoCDC.listen();

mongoCDC.on('op', (doc) => {
    console.log(JSON.stringify(doc, null, 2));
});

mongoCDC.filter('test.a').on('op', (doc) => {
    console.log("filter :: ",JSON.stringify(doc, null, 2));
});