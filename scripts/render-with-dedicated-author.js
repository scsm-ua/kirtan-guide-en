const path = require('path');
const { render } = require('songbook-md-json-parser');

// Load the first lines dictionary
const firstLines = require('../json/index.json');

render({
    prepareJson: (json, filename) => {
        json.meta = json.meta || {};
        let meta = json.meta;

        if (!meta.author && !meta["no-author"]) {
            var author = json.author && json.author[0];

            if (author) {
                var m = author.match(/by (.+)/i);
                if (m) {
                    author = m[1];
                    meta.author = author;
                }
            }
        }
    }
});
