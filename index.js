var Crawler = require("crawler");
const sqlite3 = require('sqlite3').verbose();

var express = require('express');
var expressApp = express();
var cors = require('cors');

const { join } = require('path')


const port = 80
 
const corsOptions = {
  origin: '*',
  //origin: [
  //   'http://146.71.77.32:8082',
  //   'http://146.71.77.32:8092',
  //   'http://194.37.80.181:8092/',
  //   'http://localhost:78',
  //   'http://localhost:8080',
  //  ],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: ['Content-Type', 'Authorization','X-Parse-Application-Id'],
};
expressApp.use(cors(corsOptions))

expressApp.use(express.json());
expressApp.use(express.urlencoded());

var c = new Crawler({ maxConnections : 10 });
const db = new sqlite3.Database(join(__dirname, '/electron-crawler.db'));
expressApp.get('/:cmmdName', async (req, res) => { 
  
  db.serialize(() => {
    db.run("CREATE TABLE IMAGE_RESULT (COMMODITY_NAME TEXT PRIMARY KEY NOT NULL, URL TEXT NOT NULL, CREATED_DATE INTEGER NOT NULL)",(error) => { /* console.log(error); */ });
    db.get("SELECT * FROM IMAGE_RESULT WHERE COMMODITY_NAME=$commodityName", { $commodityName : req.params.cmmdName }, (error, row) => {
      if(row && ((row.CREATED_DATE + (1000 * 60 * 60 * 24 * 30)) > new Date().valueOf()) ) {
        console.log('Got cached: ', req.params.cmmdName, ' at ', new Date(row.CREATED_DATE).toLocaleString())
        res.redirect(row.URL)
      }
      else{
        console.log('Crawling: ', req.params.cmmdName)
        c.queue([{
          uri: 'https://www.google.com.tw/search?q='+encodeURIComponent(req.params.cmmdName)+'&tbm=isch',
      
          // The global callback won't be called
          callback : async function (error, res1, done) {
            if(error) console.log(error)
            else{
                var $ = res1.$;
                // $ is Cheerio by default
                //a lean implementation of core jQuery designed specifically for the server 
                // console.log($('img')[1].attribs.src);
                let crawResult = $('img')
                if(crawResult.length > 1)  {
                  const stmt = db.prepare("INSERT INTO IMAGE_RESULT VALUES (?,?,?)");
                  stmt.run(req.params.cmmdName, $('img')[1].attribs.src, new Date().valueOf(), error => {
                    const stmtUpdate = db.prepare("UPDATE IMAGE_RESULT SET COMMODITY_NAME=$commodityName, URL=$url, CREATED_DATE=$createdDate WHERE COMMODITY_NAME=$commodityName");
                    stmtUpdate.run({ $commodityName : req.params.cmmdName, $url : $('img')[1].attribs.src, $createdDate : new Date().valueOf() }, error => {
                      if(error) console.log(error)
                    })

                    stmtUpdate.finalize();
                  });
                   
                  stmt.finalize();
                  
                  
                  res.redirect($('img')[1].attribs.src)

                }
                else res.status(404).send("Sorry can't find that!")

              
            }
            // db.close();
            done();
            
          }
        }]);


      }
      
    }) 
  });
 
 
})

expressApp.listen(port, () => {
  console.log(`Express app with crawler is listening on port ${port}`)
})