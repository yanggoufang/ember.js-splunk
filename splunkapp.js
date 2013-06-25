
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path');

var app = express();

var data =   /* sample recipe data */
    [
        {"title": "Gazpacho",
            "ingredients": "Ingredients: 2 onions, 2 garlic cloves peeled and minced, 1 cup of chopped green pepper, 2 cups water, 2 teaspoons salt, 1/3 teaspoon black pepper, 1/3 cup red wine vinegar, 1 cup peeled and chopped cucumber, 5 tablespoons olive oil",
            "directions": "Combine the onions, garlic, green peppers and tomatoes. Force through a sieve or puree in a blender. Add the salt, pepper and paprika. Add the olive oil gradually, beating steadily. Add the vinegar and water and stir well. Season to taste. Refrigerate and chill for at least two hours"},
        {"title": "Balsamic Mushrooms",
            "directions": "Place all ingredients in a (preferably nonstick) pan and let sit for a few minutes. Then cook covered over medium heat for about three minutes until they are soft. Remove the cover and cook until the liquid is almost gone, then serve.",
            "ingredients": "12 mushrooms, 1/4 cup balsamic vinegar, 1/8 cup red wine"}
    ];


var splunkdata =   /* sample recipe data */
    [
        {"count": "1",
            "threshold_severity": "High",
            "threshold_warnlevel": "High",
            "threshold_severity": "High",
            "threshold_comparator": "Low"},
        {"count": "2",
            "threshold_severity": "High",
            "threshold_warnlevel": "High",
            "threshold_severity": "High",
            "threshold_comparator": "Low"}
    ];

var splunkVMware = 
    [
        { "preview":false,
          "init_offset":0,
          "messages":
            [
              { "type":"DEBUG",
                "text":"search context: user=\"admin\", app=\"search\", bs-pathname=\"/home/splunkadmin/opt/splunk/etc\""
              }
            ],
          "results":
            [
              {"count":"5"}
            ]
        }
    ];


var splunkVMwareSID = 
    [
        {"sid":"1371626656.467"}
    ];
  
var http = require("http");
var https = require("https");
var querystring = require('querystring');
/**
 * getJSON:  REST get request returning JSON object(s)
 * @param options: http options object
 * @param callback: callback to pass the results JSON object(s) back
 */
function getJSON(options, onResult)
{
    console.log("rest::getJSON");

    //var port = options.port == 443 ? https : http;
    var prot = options.ssl == true ? https : http;
    var req = prot.request(options, function(res)
    {
        var output = '';
        console.log(options.host + ':' + res.statusCode);
        res.setEncoding('utf8');

        res.on('data', function (chunk) {
            output += chunk;
        });

        res.on('end', function() {
            var obj = JSON.parse(output);
            //var obj = output;
            onResult(res.statusCode, obj);
        });
    });

    req.on('error',function(e){
      console.log("Error: \n" + e.message); 
      console.log( e.stack );
    });
    req.write(options.post_data);
    req.end();
};


app.configure(function(){
  app.set('port', process.env.PORT || 5000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  //app.use(express.cookieParser('your secret here'));
  //app.use(express.session());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);

app.get('/recipes', function(req, res) {
    res.send(data);
});

app.get('/services/search/results', function(req, res) {
    res.send(splunkdata);
});

app.get('/services/threadholds/search/results', function(req, res) {
    res.send(splunkVMware);
});

app.get('/services/threadholds/search/results/1371626656.467', function(req, res) {
    res.send(splunkVMware);
});

app.get('/services/threadholds/search/jobid', function(req, res) {
    res.send(splunkVMwareSID);
});

app.get('/services/threadholds/search/id/:id', restID);

app.get('/services/threadholds/search/j', restSearch);

app.get('/services/threadholds/searchFacade', restSearchFacade);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

var btoa = require('btoa');
function make_base_auth(user, pass) {
    var tok = user + ':' + pass;
    var hash = btoa(tok);
    return "Basic " + hash;
}

function restSearchFacade(req, res) {
    restSearch(req, res, true);
}

function restSearch(req, res, isChain) {
    var mypost_data = querystring.stringify({
        'search':'| stats count ',
        'output_mode': 'json'});
    isChain = typeof isChain !== 'undefined' ? isChain : false; 
    var options = {
      ssl: true,
      host: 'chablis-ish-bt1',
      //host: '172.18.91.176',
      port: 8089,
      path: '/services/search/jobs',
      method: 'POST',
      rejectUnauthorized: false,
      post_data: mypost_data,
      headers: {
          'Content-Type': 'application/json',
          'Content-Length': mypost_data.length,
          'Authorization': make_base_auth('admin','changeme')
      }
    };
    
    getJSON(options,
        function(statusCode, result)
        {
            // I could work with the result html/json here.  I could also just return it
            console.log("onResult: (" + statusCode + ")" + JSON.stringify(result));
            res.statusCode = statusCode;
            if (isChain == true) {
              var jobid = result["sid"];
              restResultByJobID( res, jobid); 
            }
            else {
              res.send(JSON.stringify(result));
            }
          });

}

function restID(req, res){
  var id = req.params.id;
    console.log('Retrieving splunk search: ' + id);

    restResultByJobID(res,id);

}

function restResultByJobID(res, jobid) {
    console.log("restResultBy job ID: jobid = " + jobid);
    var mypost2_data = querystring.stringify({
        'output_mode': 'json'});
    var myoptions = {
      ssl: true,
      host: 'chablis-ish-bt1',
      //host: '172.18.91.176',
      port: 8089,
      path: '/services/search/jobs/'+jobid+'/results',
      //method: 'POST',
      method: 'GET',
      rejectUnauthorized: false,
      post_data: mypost2_data,
      headers: {
      //    'Content-Type': 'application/json',
      //    'Content-Type':'application/x-www-form-urlencoded',
          'Content-Length': mypost2_data.length,
          'Authorization': make_base_auth('admin','changeme')
      }
    };

    console.log("restResultBy job ID: myoptions.path = " + myoptions.path);
    
    getJSON(myoptions,
        function(statusCode, result)
        {
            // I could work with the result html/json here.  I could also just return it
            console.log("restResultByJobID: (" + statusCode + ")" + JSON.stringify(result));
            res.statusCode = statusCode;
            res.send( res, result); // chain the ajax one by one
            //res.send(JSON.stringify(result));
          });
}