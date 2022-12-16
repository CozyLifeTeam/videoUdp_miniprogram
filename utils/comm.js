const { ADDRESS_NOWENV } = require("../constants/server")



const formatTime = date => {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    const second = date.getSeconds()

    return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatNumber = n => {
    n = n.toString()
    return n[1] ? n : `0${n}`
}

//app初始化调用
function init(options, lang_dict) {
    let app = getApp()
    // queryDevice();
    // let actual = JSON.parse(options.query.actual)
    // console.log("actual......", actual)
    for (let key in options.query) {
        switch (key) {
            case "device_name":
                this.setDeviceName(options['query'][key])
                break;
            case "domain":
                app['globalData'][key] = "https://" + options['query'][key]
                break
            case "isOnline":
                app['globalData']["onlineStatus"] = 1 == options['query'][key]
                break;
            case "actual":
                app['globalData']["actual"] = JSON.parse(options['query'][key])
                break;
            default:
                app['globalData'][key] = options['query'][key]
                break;
        }
    }

}
//在page show的时候调用
function pageShow(page) {
    let app = getApp()
    app.store.getPage("offline").check()
    // if (false === app.globalData.openDeviceInfo.is_online) {
    //   console.log(page.offline);
    //   if (page.offline) {
    //     console.log("pageShow-offline.show");
    //     page.offline.show()
    //   }
    // } else {
    //   if (page.offline) {
    //     console.log("pageShow-offline.hide");
    //     page.offline.hide()
    //   }
    // }
}
//页面的初始化函数
function pageInit(page) {
    //设置语言
    let app = getApp()
    if (!page.data.lang) {
        page.setData({
            lang: app.globalData.lang_dict,
            actual: app.globalData.actual,
        })
    }
    let sysinfo = app.globalData.sysInfo;
    let pageDownHeight = sysinfo.windowHeight - app.globalData.CustomBar;
    page.setData({
        pageDownHeight: pageDownHeight
    })
}
function pageInitLang(page, lang_dict = [{}]) {
    //设置语言
    let app = getApp()
    let pubLang = app.lang.pubLang;
    pubLang.push(...lang_dict);
    if (!page.data.lang) {
        page.setData({
            lang: transLang(pubLang),
            device_name: app.globalData.openDeviceInfo.device_name
        })
    }
}

/**
 * //页面配置文件初始化函数
 * @param {*} page 
 * @param {*} projectSet 
 * @param {*} langArr 
 */
function pageInitPro(page, projectSet, langArr) {
    //设置语言
    let app = getApp()
    langArr.push(...app.lang.pubLang)
    let lang = {}
    for (let j = 0; j < langArr.length; j++) {
        lang[langArr[j].key] = langArr[j].zh
    }
    for (let i = 0; i < projectSet.length; i++) {
        if (projectSet[i].mpaas_id == app.globalData.openDeviceInfo.mpaas_url) {
            let data = {
                lang: lang,
                device_id: getDeviceID(),
                cssFirstName: projectSet[i].cssFirstName,
                device_name: app.globalData.openDeviceInfo.device_name
            }
            Object.assign(data, projectSet[i].modules, projectSet[i].modify, projectSet[i].extra, projectSet[i].jsmod);
            page.setData(data)
            break;
        }
    }
}
//翻译lang
function transLang(lang) {
    let lang1 = {}
    // let key = getLang()
    let key = 'zh' //暂时模式中文
    if (lang[0][key] == undefined) {
        key = 'en'
    }
    for (let item of lang) {
        // console.log('translang', item)
        lang1[item['key']] = item[key]
    }
    return lang1
}

// hsvToRgb([120, 50, 100]); //输出：[127, 255, 127]
//参数arr的3个值分别对应[h, s, v]
function hsvToRgb(arr) {
    var h = arr[0], s = arr[1], v = arr[2];
    h = h == 360 ? 0 : h;
    s = s / 100;
    v = v / 100;
    var r = 0, g = 0, b = 0;
    var i = parseInt((h / 60) % 6);
    var f = h / 60 - i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);
    switch (i) {
        case 0:
            r = v; g = t; b = p;
            break;
        case 1:
            r = q; g = v; b = p;
            break;
        case 2:
            r = p; g = v; b = t;
            break;
        case 3:
            r = p; g = q; b = v;
            break;
        case 4:
            r = t; g = p; b = v;
            break;
        case 5:
            r = v; g = p; b = q;
            break;
        default:
            break;
    }
    r = parseInt(r * 255.0)
    g = parseInt(g * 255.0)
    b = parseInt(b * 255.0)
    return [r, g, b];
}

// rgbToHsv([3,3,3]); // 输出：[0,0,1]
//参数arr的值分别为[r,g,b]
function rgbToHsv(arr) {
    var h = 0, s = 0, v = 0;
    var r = arr[0], g = arr[1], b = arr[2];
    arr.sort(function (a, b) {
        return a - b;
    })
    var max = arr[2]
    var min = arr[0];
    v = max / 255;
    if (max === 0) {
        s = 0;
    } else {
        s = 1 - (min / max);
    }
    if (max === min) {
        h = 0;//事实上，max===min的时候，h无论为多少都无所谓
    } else if (max === r && g >= b) {
        h = 60 * ((g - b) / (max - min)) + 0;
    } else if (max === r && g < b) {
        h = 60 * ((g - b) / (max - min)) + 360
    } else if (max === g) {
        h = 60 * ((b - r) / (max - min)) + 120
    } else if (max === b) {
        h = 60 * ((r - g) / (max - min)) + 240
    }
    h = parseInt(h);
    s = parseInt(s * 100);
    v = parseInt(v * 100);
    return [h, s, v]
}

//颜色转换,hexStr=FF43EE=> hsv:[100,67,50]
function rgbHexToHsv(hexStr) {
    let hex = parseInt(hexStr, 16)
    let r = hex >>> 16 & 0xff
    let g = hex >>> 8 & 0xff
    let b = hex & 0xff

    return rgbToHsv([r, g, b])
}

//rgb转成16进制
function rgb_hex(rgb) {
    let r = rgb[0]
    let g = rgb[1]
    let b = rgb[2]
    let value = (1 << 24) + r * (1 << 16) + g * (1 << 8) + b
    value = value.toString(16)
    return value.slice(1)
}

//hsv转成16进制rgb
function hsv2RGBHEX(h, s, v) {
    let [r, g, b] = hsvToRgb([h, s, v])
    return rgb_hex([r, g, b])
}

//获取设备id
function getDeviceID() {
    return getApp()['globalData']['openDeviceInfo']['device_id'];
}

//获取设备key
function getDeviceKey() {
    return getApp()['globalData']['openDeviceInfo']['device_key'];
}

//获取token
function getToken() {
    return getApp()['globalData']['openDeviceInfo']['token'];
}

//获取语言
function getLang() {
    let lang = getApp()['globalData']['lang']
    return undefined == lang ? 'zh' : lang;
    // return 'es';
}

//获取设备名称
function getDeviceName() {
    return getApp()['globalData']['openDeviceInfo']['device_name']
}

//device_name可能会改变
function setDeviceName(deviceName) {
    getApp()['globalData']['openDeviceInfo']['device_name'] = deviceName
}

//获取pid
function getPID() {
    return getApp()['globalData']['openDeviceInfo']['pid']
}

//判断两个object是否相等
function isObjEqual(o1, o2) {
    var props1 = Object.getOwnPropertyNames(o1);
    var props2 = Object.getOwnPropertyNames(o2);
    if (props1.length != props2.length) {
        return false;
    }
    for (var i = 0, max = props1.length; i < max; i++) {
        var propName = props1[i];
        if (o1[propName] !== o2[propName]) {
            return false;
        }
    }
    return true;
}

function getAPIDomain() {
    return getApp()['globalData']['openDeviceInfo']['domain']
}

//获取mpaasid
function getMpaasID() {
    return getApp()['globalData']['openDeviceInfo']['mpaas_id']
}

String.prototype.padStart = function padStart(targetLength, padString) {
    targetLength = targetLength >> 0; //truncate if number or convert non-number to 0;
    padString = String((typeof padString !== 'undefined' ? padString : ' '));
    if (this.length > targetLength) {
        return String(this);
    }
    else {
        targetLength = targetLength - this.length;
        if (targetLength > padString.length) {
            padString += padString.repeat(targetLength / padString.length); //append to original to ensure we are longer than needed
        }
        return padString.slice(0, targetLength) + String(this);
    }
};

//保存自定义场景
function saveMyScene(index, value, name) {
    //保存到storage
    wx.setStorage({
        key: getDeviceID() + '_myscene_' + index,
        data: {
            value: value,
            name: name,
        },
        success: () => {

        },
        fail: () => {

        },
        complete: () => {

        }
    });
}

//获取自定义场景
function getMyScene(index, callback) {
    wx.getStorage({
        key: getDeviceID() + '_myscene_' + index,
        success: (result) => {
            // console.log('getMyScene.index', index, 'getMyScene.result', result)
            if (!result.data) {
                callback(null)
            } else {
                callback(result.data)
            }

        },
        fail: (res) => {
            // console.log(res)
            callback(null)
        },
        complete: () => {

        }
    });
}

//获取lang_dict
function getLangDict() {
    return getApp()['globalData']['lang_dict']
}

//得到一个两数之间的随机整数
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //不含最大值，含最小值
}
//判断数字是否需要加0，比如日期9-09
function fixNumToTwo(num) {
    return num < 10 ? '0' + num : num;
}

//本地文件存储初始化
function localFileInit() {
    let app = getApp();
    //读取本地文件列表
    let localFile = wx.getStorageSync({ key: 'localFileList' });
    //判断本地文件列表是否存在
    if (localFile && localFile.data && localFile.data.localFileList && Object.keys(localFile.data.localFileList).length > 0) {
        app.globalData.localFileList = localFile.data.localFileList;
    } else {
        app.globalData.localFileList = {}
    }
    console.log('本地文件列表初始化完成：', app.globalData.localFileList);
}

//对比补充页面所需要的文件
function fixPageLoacalFile(needFileName, needFilePath, that) {
    let app = getApp()
    //装载已有的文件
    that.setData({ localFileList: app.globalData.localFileList })
    //查找还需要的文件
    for (let i = 0; i < needFileName.length; i++) {
        if (!app.globalData.localFileList[needFileName[i]]) {
            downLocalFile(needFileName[i], needFilePath, that, app);
        }
    }
}
//下载并装载页面所需要的文件
function downLocalFile(fileName, needFilePath, that, app) {

    wx.downloadFile({
        url: ADDRESS_NOWENV + needFilePath + fileName,
        header: {},
        success: (result) => {
            console.log("downloadFile:", result);
            wx.saveFile({
                apFilePath: result.apFilePath,
                success: (result) => {
                    console.log("saveFile:", result);
                    app.globalData.localFileList[fileName] = result.apFilePath;
                    that.setData({
                        localFileList: app.globalData.localFileList
                    })
                },
                fail: (result) => {
                    console.log(result);
                }
            });
        },
        fail: (result) => {
            console.log(result);
        }
    });

}

function localFileUpdate() {
    wx.setStorage({
        key: 'localFileList',
        data: {
            localFileList: getApp().globalData.localFileList
        },
        success: function () {
            console.log("缓存localFileList：", getApp().globalData.localFileList);
        }
    });
}
//查找对象key
function findKey(obj, value) {
    for (let key in obj) {
        if (obj[key] == value) return key;
    }
}
//深拷贝
function deepCopy(fromObj, toObj) {
    toObj = JSON.parse(JSON.stringify(fromObj))
    return toObj
}

// ArrayBuffer转16进度字符串示例
function ab2hex(buffer) {
    var hexArr = Array.prototype.map.call(
        new Uint8Array(buffer),
        function (bit) {
            return ('00' + bit.toString(16)).slice(-2)
        }
    )
    return hexArr.join('');
}

// 格式化时间
function formatSeconds(value) {
    var theTime = parseInt(value);
    var middle = 0;
    var hour = 0;
    if (theTime > 60) {
        middle = parseInt(theTime / 60);
        theTime = parseInt(theTime % 60);
        if (middle > 60 || middle == 60) {
            hour = parseInt(middle / 60);
            middle = parseInt(middle % 60);
        }
    }
    var result = "";
    if (parseInt(theTime) < 10) {
        result = "0" + parseInt(theTime);
    } else {
        result = "" + parseInt(theTime);
    }
    if (middle > 0) {
        if (middle < 10) {
            result = "" + "0" + parseInt(middle) + ":" + result;
        } else {
            result = "" + parseInt(middle) + ":" + result;
        }
    }
    if (middle == 0) {
        result = "00" + ":" + result;
    }
    if (hour > 0) {
        if (hour < 10) {
            result = "" + "0" + parseInt(hour) + ":" + result;
        } else {
            result = "" + parseInt(hour) + ":" + result;
        }
    }
    return result;
}

//deviceId中提取出mac地址 device_id: "63187142450000000000"
function deviceId2Mac(str) {
    var s = str.substring(str.length - 2, str.length) + ":" + str.substring(str.length - 4, str.length - 2) + ":" + str.substring(str.length - 6, str.length - 4) + ":" + str.substring(str.length - 8, str.length - 6) + ":" + str.substring(str.length - 10, str.length - 8) + ":" + str.substring(str.length - 12, str.length - 10)
    return s.toUpperCase()
}

function deviceId2Mac2(str) {
    var s = str.substring(str.length - 12, str.length - 10) + ":" + str.substring(str.length - 10, str.length - 8) + ":" + str.substring(str.length - 8, str.length - 6) + ":" + str.substring(str.length - 6, str.length - 4) + ":" + str.substring(str.length - 4, str.length - 2) + ":" + str.substring(str.length - 2, str.length)
    return s.toUpperCase()
}

//使手机发生较短时间的振动（15 ms）
function soundEffect() {
    wx.vibrateShort({ type: 'medium' })
}

module.exports = {
    formatTime,
    init,
    pageInit,
    pageInitPro,
    pageInitLang,
    hsvToRgb,
    rgbToHsv,
    rgbHexToHsv,
    rgb_hex,
    hsv2RGBHEX,
    getDeviceID,
    getDeviceKey,
    getToken,
    getLang,
    getDeviceName,
    setDeviceName,
    getPID,
    isObjEqual,
    getAPIDomain,
    getMpaasID,
    saveMyScene,
    getMyScene,
    getLangDict,
    getRandomInt,
    fixNumToTwo,
    localFileInit,
    fixPageLoacalFile,
    downLocalFile,
    localFileUpdate,
    findKey,
    deepCopy,
    ab2hex,
    pageShow,
    deviceId2Mac,
    deviceId2Mac2,
    formatSeconds,
    soundEffect,
}
