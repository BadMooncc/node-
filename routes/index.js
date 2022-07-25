var express = require('express');
var router = express.Router();
var axios = require('axios')
var fs = require('fs')
const json2xls = require('json2xls');
const cheerio = require('cheerio');
var classArr = []
let result = []
var classLoadComplete = false
let total = 1;
let page = 1;
let err = ''
let fileName = ''
let pageTotal = 20;
let timer = null
let timer2 = null;
function writeXlsx() {
  let jsonTxt = JSON.stringify(result)
    let json = null
    const jsonArray = [];
    jsonTxt = jsonTxt.replace(/厂长|队长|老板|联系人|总经理/g,'经理')
    jsonTxt = jsonTxt.replace(/手机号码/g,'经理手机')
    json = JSON.parse(jsonTxt)
    json.forEach(function(item){
      let temp = {}
      Object.keys(item).forEach((el) => {
        temp[el] = item[el]
      })
      jsonArray.push(temp);
    });
    let xls = json2xls(jsonArray);
    fs.writeFileSync(`./public/excel/${fileName}.xlsx`, xls, 'binary', function(err) {
      console.log(err, `写入${arr.length}`)
    });
}
function accumulate (arr) {
  let pageHref = arr.shift();
  axios({
    url: pageHref,
    method: 'get',
  }).then(res => {
    let html = res.data;
    const $ = cheerio.load(html);
    if(!$('#gongshang tr:first td')[1] && $('#contact .codl dt')[0] && $('#contact .codl dt')[1]) {
      err = '当前ip受限,以将爬取数据全部保存，请更换ip'
      return;
    }
    let resTxt = {
      company: $('#gongshang tr:first td')[1] && $('#gongshang tr:first td')[1].children && $('#gongshang tr:first td')[1].children[0].data,
      [$('#contact .codl dt')[0] && $('#contact .codl dt')[0].children[0].data]: $('#contact .codl dd')[0] && $('#contact .codl dd')[0].children[0].data,
      [$('#contact .codl dt')[1] && $('#contact .codl dt')[1].children[0].data]: $('#contact .codl dd')[1] && $('#contact .codl dd')[1].children[0].data,
      [$('#contact .codl dt')[2] && $('#contact .codl dt')[2].children[0].data]: $('#contact .codl dd')[2] && $('#contact .codl dd')[2].children[0].data,
      [$('#contact .codl dt')[3] && $('#contact .codl dt')[3].children[0].data]: $('#contact .codl dd')[3] && $('#contact .codl dd')[3].children[0].data,
    }
    result.push(resTxt)
    clearTimeout(timer2)
    if(arr.length%2 === 0) {
      writeXlsx()
      // fs.writeFile(fileName ? `./public/excel/${fileName}.json` : 'xlsx-result.json', jsonTxt, null, function (err) {
      //   console.log(err, `写入${arr.length}`)
      // });
    }
    console.log(resTxt, `${arr.length}`, 'result')
    timer2 = setTimeout(() => {
      accumulate(arr)
    }, 4000)
  }).catch(err => {
    console.log(err)
    timer2 = setTimeout(() => {
      accumulate(arr)
    }, 4000)
  })
}
const getClassTotal = function(classHref) {
  let getTotal =  function() {
    let targetHref = classHref
    if(page > 1) targetHref = classHref.slice(0, classHref.indexOf('.htm')) + `-p${page}.htm`
    console.log(targetHref, '-------targetHref')
    axios.get(targetHref).then(res => {
      const $ = cheerio.load(res.data);
      Object.values($('.companylist li h4>a')).forEach((item, index) => {
        if(item.attribs) {
          let href = 'https:' + item.attribs.href
          classArr.push(href)
        }
      })
      if(page === 1) {
        let str = $('.boxcontent')[3]?.children[0]?.data;
        pageTotal = +(str.slice(str.indexOf('分为')+2, str.indexOf('页，')))
      }
      clearTimeout(timer)
      page+=1
      // console.log(classHref, '---------')
      if(page <= pageTotal) {
        console.log(`${page}/${pageTotal}`)
        timer = setTimeout(() => {
          getTotal()
        }, 4000);
      } else {
        classLoadComplete = true
        total = classArr.length
        accumulate(classArr)
        console.log(classArr.length)
      }
    }).catch(err => {
      console.log(err)
    })
  }
  getTotal()
}



/* GET home page. */
router.get('/', function(req, res, next) {
  clearTimeout(timer)
  clearTimeout(timer2)
  res.render('index', { title: 'Express' });
});
router.get('/api/list', function(req, res, next) {
  try {
    let data = fs.readFileSync(`./xlsx-1.json`, 'utf-8')
    res.json({
      code: 200,
      data
    })
  }catch(err) {
    res.json(err)
  }
 
});
router.get('/api/procecss', function(req, res, next) {
  if(err) {
    writeXlsx()
    res.json({
      code: 500,
      msg: err,
      data: {}
    })
    return 
  }
  res.json({
    code: 200,
    data: {
      total,
      current: result.length,
      page,
      pageTotal,
      classLoadComplete
    }
  })
});

router.get('/api/start', function(req, res, next) {
  // classHref = req.query.url;
  getClassTotal(req.query.url)
  fileName = req.query.fileName
  console.log(fileName, 'fileName')
  res.json({
    message: '成功',
    code: 200
  })
  res.end()
});

module.exports = router;
