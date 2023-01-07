const md5 = require('../utils/md5.js')

let curPage = null

let hexDatas = ""
let bleDatasList = []
let bleDatasBackArr = []

let sendFun = null

function getCurPage() {
    return curPage
}

function setCurPage(page) {
    curPage = page
}

/**
 * 根据不同连接类型发送配网指令
 * @param {*} dev_type 连接类型
 */
function getNetSetDatas(dev_type) {
    let app = getApp(),
        cmd = 1,
        len = 163,
        ssid = new Array(32).fill(0),
        passwd = new Array(64).fill(0),
        bssid = new Array(6).fill(0),
        dev_key = getBleDeviceKey(),
        open_id = new Array(33).fill(0),
        lat = new Array(4).fill(0),
        lng = new Array(4).fill(0),
        domain = new Array(10).fill(0);

    const storageLoginInfo = wx.getStorageSync('loginInfo');
    if (dev_type == 2) {
        ssid.forEach((item, index) => {
            ssid[index] = app.store.freeData['wifiInfo'].ssid[index] ? app.store.freeData['wifiInfo'].ssid[index] : 0;
            if (typeof (ssid[index]) == 'string') {
                ssid[index] = ssid[index].charCodeAt();
            }
        });
        passwd.forEach((item, index) => {
            passwd[index] = app.store.freeData['wifiInfo'].pdw[index] ? app.store.freeData['wifiInfo'].pdw[index] : 0;
            if (typeof (passwd[index]) == 'string') {
                passwd[index] = passwd[index].charCodeAt();
            }
        });
        const loginInfo = storageLoginInfo.cozylife ? storageLoginInfo.cozylife : storageLoginInfo.wechat;
        open_id.forEach((item, index) => {
            open_id[index] = loginInfo.token[index] ? loginInfo.token[index] : 0;
            if (typeof (open_id[index]) == 'string') {
                open_id[index] = open_id[index].charCodeAt();
            }
        });
        if (wx.getStorageSync('isTest')) {
            // 测试时就加
            domain[0] = "t".charCodeAt();
            domain[1] = "e".charCodeAt();
            domain[2] = "s".charCodeAt();
            domain[3] = "t".charCodeAt();
        }
        else {
            // 线上环境
            domain[0] = "a".charCodeAt();
            domain[1] = "p".charCodeAt();
            domain[2] = "i".charCodeAt();
            domain[3] = "-".charCodeAt();
            domain[4] = "c".charCodeAt();
            domain[5] = "n".charCodeAt();
        }

        return [[cmd, len, ...ssid, ...passwd, ...bssid, ...dev_key, ...open_id, ...lat, ...lng, ...domain], [cmd, 153, ...ssid, ...passwd, ...bssid, ...dev_key, ...open_id, ...lat, ...lng,]];
    }

    let data = [1, 153]
    for (let i = 0; i < 102; i++) {
        data.push(0)
    }
    let key = getBleDeviceKey()
    data = data.concat(key)
    for (let j = 0; j < 41; j++) {
        data.push(0)
    }
    let ne = []
    for (let k = 0; k < 10; k++) {
        ne.push(0)
    }
    ne = data.concat(ne)
    ne[1] = 163;
    console.log("[3][ok]1.1 开始获取配网指令", [data, ne]);
    return [data, ne]
}

/**
 * //发送蓝牙指令
 * @param {*} datas 需要发送的`16进制数据`
 */
function sendDatas(datas, BluetoothApi) {
    bleDatasFix(datas)
    if (!sendFun) {
        toDispatch(BluetoothApi)
    }
}

/**
 * //蓝牙指令分包 http://doc.doit/project-5/doc-11/ 在请求包的位置
 * @param {*} datas 16进制数据
 */
function bleDatasFix(datas) {
    let hex = []
    let count = 0;

    for (let i = 0; i < datas.length; i += 17) {
        // 数据
        hex = datas.slice(i, i + 17)
        // 包序号
        hex.unshift(count)
        // 协议版本号
        hex.unshift(1)
        // 补全为19个
        if (hex.length != 19) {
            let cha = 19 - hex.length
            for (let j = 0; j < cha; j++) {
                hex.push(0)
            }
        }

        if (count == parseInt(datas.length / 17)) {
            hex[1] = hex[1] + 128
        }
        count += 1
        hex.push(crc8(hex))
        bleDatasList.push(hex);
    }
    console.log("[2][ok]2.蓝牙指令分包完成：", bleDatasList);
}
const CHECKSUM_TABLE = [
    0x00, 0x07, 0x0e, 0x09, 0x1c, 0x1b,
    0x12, 0x15, 0x38, 0x3f, 0x36, 0x31, 0x24, 0x23, 0x2a,
    0x2d, 0x70, 0x77, 0x7e, 0x79, 0x6c, 0x6b, 0x62, 0x65,
    0x48, 0x4f, 0x46, 0x41, 0x54, 0x53, 0x5a, 0x5d, 0xe0,
    0xe7, 0xee, 0xe9, 0xfc, 0xfb, 0xf2, 0xf5, 0xd8, 0xdf,
    0xd6, 0xd1, 0xc4, 0xc3, 0xca, 0xcd, 0x90, 0x97, 0x9e,
    0x99, 0x8c, 0x8b, 0x82, 0x85, 0xa8, 0xaf, 0xa6, 0xa1,
    0xb4, 0xb3, 0xba, 0xbd, 0xc7, 0xc0, 0xc9, 0xce, 0xdb,
    0xdc, 0xd5, 0xd2, 0xff, 0xf8, 0xf1, 0xf6, 0xe3, 0xe4,
    0xed, 0xea, 0xb7, 0xb0, 0xb9, 0xbe, 0xab, 0xac, 0xa5,
    0xa2, 0x8f, 0x88, 0x81, 0x86, 0x93, 0x94, 0x9d, 0x9a,
    0x27, 0x20, 0x29, 0x2e, 0x3b, 0x3c, 0x35, 0x32, 0x1f,
    0x18, 0x11, 0x16, 0x03, 0x04, 0x0d, 0x0a, 0x57, 0x50,
    0x59, 0x5e, 0x4b, 0x4c, 0x45, 0x42, 0x6f, 0x68, 0x61,
    0x66, 0x73, 0x74, 0x7d, 0x7a, 0x89, 0x8e, 0x87, 0x80,
    0x95, 0x92, 0x9b, 0x9c, 0xb1, 0xb6, 0xbf, 0xb8, 0xad,
    0xaa, 0xa3, 0xa4, 0xf9, 0xfe, 0xf7, 0xf0, 0xe5, 0xe2,
    0xeb, 0xec, 0xc1, 0xc6, 0xcf, 0xc8, 0xdd, 0xda, 0xd3,
    0xd4, 0x69, 0x6e, 0x67, 0x60, 0x75, 0x72, 0x7b, 0x7c,
    0x51, 0x56, 0x5f, 0x58, 0x4d, 0x4a, 0x43, 0x44, 0x19,
    0x1e, 0x17, 0x10, 0x05, 0x02, 0x0b, 0x0c, 0x21, 0x26,
    0x2f, 0x28, 0x3d, 0x3a, 0x33, 0x34, 0x4e, 0x49, 0x40,
    0x47, 0x52, 0x55, 0x5c, 0x5b, 0x76, 0x71, 0x78, 0x7f,
    0x6a, 0x6d, 0x64, 0x63, 0x3e, 0x39, 0x30, 0x37, 0x22,
    0x25, 0x2c, 0x2b, 0x06, 0x01, 0x08, 0x0f, 0x1a, 0x1d,
    0x14, 0x13, 0xae, 0xa9, 0xa0, 0xa7, 0xb2, 0xb5, 0xbc,
    0xbb, 0x96, 0x91, 0x98, 0x9f, 0x8a, 0x8d, 0x84, 0x83,
    0xde, 0xd9, 0xd0, 0xd7, 0xc2, 0xc5, 0xcc, 0xcb, 0xe6,
    0xe1, 0xe8, 0xef, 0xfa, 0xfd, 0xf4, 0xf3
];

function crc8(buffer) {
    let crc = new Uint8Array(1);
    crc = 0;
    for (let i = 0; i < buffer.length; i++) {
        crc = CHECKSUM_TABLE[(crc ^ (buffer[i] & 0xFF)) & 0xFF];
    }
    return (crc & 0xff);
}

function crc8maxin(datas) {
    let a = 0;
    for (let i = 0; i < datas.length; i++) {
        a = a ^ datas[i];
        for (var j = 0; j < 8; j++) {
            if (a & 1) {
                a = (a >> 1) ^ 140;
            } else {
                a = (a >>= 1)
            }
        }
    }
    return a;
}


function clearDatas() {
    hexDatas = ""
}

function toDispatch(BluetoothApi) {
    clearInterval(sendFun);
    sendFun = setInterval(function () {
        if (bleDatasList.length == 0) {
            clearInterval(sendFun)
            sendFun = null
            return
        }

        let send = []
        send = bleDatasList[0];
        if (BluetoothApi.isSending == false) {
            bleDatasList = bleDatasList.splice(1);
            BluetoothApi.sendMsg(send);
        } else {
            // console.log("阻止并行啦！");
        }
    }, 100)
}

//获取devicekey
function getDeviceKey() {
    let app = getApp()
    let str = md5.hexMD5("" + app.globalData.czUserInfo.uid);
    str = str.substring(0, 10);

    let key = []
    for (let i = 0; i < str.length; i++) {
        key.push((str.charAt(i).charCodeAt() % 10))
    }
    return key
}

/**
 * //获取发送到蓝牙端的devicekey
 */
function getBleDeviceKey() {
    let a = getDeviceKey()
    let b = []
    for (let i = 0; i < a.length; i++) {
        b.push(('' + a[i]).charCodeAt())
    }
    return b
}

//面板sendCmd处理 datas={1:1,2:0,6:'ac0a0f0a....'}
function sendCmd(datas) {
    let app = getApp()
    console.log("sendCmd:", datas);

    if (Object.keys(datas).length == 0) return
    //判断设备类型 单个、群组、场景
    if (app.globalData.openDeviceInfo.device_group_id || app.globalData.openDeviceInfo.scene_id) {
        moreDeviceSend(datas, 3)
        return
    }
    //判断当前面板设备是用哪种通信方式
    if (app.globalData.openDeviceInfo.network == "01") {
        //数据重组发到蓝牙分包
        //1、获取所有key  value  2、拼接数组
        let str = []
        for (let key in datas) {
            str.push(3)
            let len = 1
            let ha = null
            if (isNaN(datas[key])) {
                ha = hexStr2intArr(datas[key])
            } else {
                ha = intTo255Arr(datas[key])
            }
            len += ha.length
            str.push(len)
            str.push(parseInt(key))
            str = str.concat(ha)
        }
        console.log(str)
        sendDatas(str)
    } else {
        //无需重组直接socket通信
        // app.dispatch.type.socket.sendMsg(datas,cmd)
        control(datas);
    }

    function control(data) {
        let arr = Object.keys(data);
        let array = arr.map((s) => {
            return parseInt(s)
        })
        let msg = {
            "attr": array,
            "data": data
        };
        // getApp().hextool.sendCmd(JSON.stringify(msg),3)
        getApp().dispatch.type.socket.sendMsg(JSON.stringify(msg), 3);
    }

}

//单个、群组、场景控制组包发送给服务器
function moreDeviceSend(datas, cmd) {
    let app = getApp()
    let payload2 = datas
    let type2 = "device"
    let target_id2 = app.globalData.openDeviceInfo.device_id
    if (cmd == 2) {
        payload2 = {}
        if (app.store.freeData['dp14']) {
            payload2[14] = app.store.freeData['dp14']
        } else {
            payload2[14] = "00000000000000000000000000000000000000000000000000"
        }
    } else {
        if (datas[14]) app.store.freeData['dp14'] = datas[14]
    }
    if (app.globalData.openDeviceInfo.device_group_id) {
        type2 = "device_group"
        target_id2 = '' + app.globalData.openDeviceInfo.device_group_id
    }
    if (app.globalData.openDeviceInfo.scene_id) {
        type2 = "scene"
        target_id2 = '' + app.globalData.openDeviceInfo.scene_id
    }
    app.dispatch.type.https.postHttps('/api/app/control/execution', {
        token: app.globalData.czUserInfo.token,
        type: type2,
        target_id: target_id2,
        payload: payload2
    })
        .then(function (res) {
            console.log("moreDeviceSend-OK", res)
            if (res.ret == 1) {
                //调用最后一个页面的TCPcallback函数
                let p = getCurrentPages()
                if (typeof (p[p.length - 1].TCPcallback) === 'function') {
                    p[p.length - 1].TCPcallback(payload2, cmd);
                } else {
                    if (typeof p[0].TCPcallback === 'function') p[0].TCPcallback(payload2, cmd);
                }
                app.globalData.actual = payload2;
            } else {
                wx.showToast({
                    title: res.desc,
                    icon: 'none'
                })
            }
        })
        .catch(function (res) {
            console.log("fail", res)
        })

}

//16进制字符串转为int数组
function hexStr2intArr(hex) {
    let b = []
    if (hex.length % 2 != 0) {
        return b
    }
    for (let i = 0; i < hex.length; i += 2) {
        b.push(parseInt(hex.substring(i, i + 2), 16))
    }
    return b
}

/**
 * //面板和主界面层数据返回处理
 * @param {*} msg 蓝牙数据包组包
 * @param {*} network 网络方式
 */
function datasBackToPage(msg, network) {
    let data = {}
    let cmd = 0
    //根据网络方式对数据进行处理然后返回给页面或者面板
    if (network == "01" || network == "02") {
        //蓝牙数据
        if (msg[0] == 0 || msg[0] == 1 || msg[4] == 1) {
            //cmd0 1  返回给主界面层  配网 启动信息
            if (curPage) {
                curPage.onBLEdatas(msg);
            }
            return
        } else if (msg[0] == 2 || msg[0] == 3 || msg[0] == 10) {
            //cmd2 3  返回给面板层  通信控制数据
            if (curPage) {
                curPage.onBLEdatas(resolveBleCmd23Datas(msg));
            } else {
                data = resolveBleCmd23Datas(msg)
                // cmd = msg[0] - 1
            }

        }
    } else {
        //socket数据
        console.log("backData.......", msg)
        // var dataMsg = msg.split("=")[4];
        // cmd=publish&topic=control_1234&device_id=1234&device_key=1234&message={\"cmd\":3,\"pv\":0,\"sn\":\"1668840096000\",\"msg\":{\"data\":{\"1\":1},\"attr\":[\"1\"]}}
        var dataMsg = msg.split("message=")[1];
        if (dataMsg != undefined) {
            var message = JSON.parse(dataMsg);
            cmd = message.cmd;
            getApp().globalData.sn = message.sn;
            if (message.msg != undefined && message.msg.data != undefined) {
                console.log("message.msg", message.msg)
                data = message.msg.data
            }
        }
    }
    //调用最后一个页面的TCPcallback函数
    let p = getCurrentPages()
    // console.log(p, "页面栈出问题了");
    // console.log(data, "准备调用TCPcallback函数，这是当前数据");
    if (typeof (p[p.length - 1].TCPcallback) === 'function') {
        p[p.length - 1].TCPcallback(data, cmd);
    } else {
        if (typeof p[0].TCPcallback === 'function') p[0].TCPcallback(data, cmd);
    }
    getApp().globalData.actual = data;
}

//面板queryDevice处理 attr=[0,14]
function queryDevice(datas) {
    let app = getApp()
    if (datas.length == 0) datas = [0];
    console.log(app.globalData.openDeviceInfo);
    const { device_group_id, scene_id, network } = app.globalData.openDeviceInfo;
    //判断设备类型 单个、群组、场景
    if (device_group_id || scene_id) {
        moreDeviceSend(datas, 2)
        return
    }
    //判断当前面板设备是用哪种通信方式
    if (network == "01") {
        //数据重组发到蓝牙分包
        //1、获取所有key  value  2、拼接数组
        let str = []
        str.push(2)
        str.push(datas.length)
        for (let index in datas) {
            str.push(parseInt(datas[index]))
        }
        console.log(str)
        sendDatas(str)
    } else {
        //无需重组直接socket通信
        queryDevices(datas)
    }
}

function queryDevices(attr) {
    if (undefined == attr) {
        attr = [0]
    }
    let msg = {
        "attr": attr
    };
    console.log("msg...", JSON.stringify(msg))
    getApp().dispatch.type.socket.sendMsg(JSON.stringify(msg), 2)
}

/**
 * //获取当前时间戳的16进制数
 */
function timestampToHexIntArray() {
    let b = parseInt(new Date().getTime() / 1000).toString(16)
    let c = [1, 1, 1, 1]
    c[3] = parseInt(b.substring(0, 2), 16)
    c[2] = parseInt(b.substring(2, 4), 16)
    c[1] = parseInt(b.substring(4, 6), 16)
    c[0] = parseInt(b.substring(6, 8), 16)
    return c;
}

/**
 * 获取CMD0
 */
function getCmd0() {
    let c = timestampToHexIntArray();
    console.log(c);
    c.unshift(4)
    c.unshift(0)
    return c
}

//蓝牙数据返回组包
function bleDatasBack(res) {
    let datas = Array.from(new Uint8Array(res));
    console.log("从蓝牙设备接收到的生数据", datas);
    //先校验CRC8
    if (crc8(datas.slice(0, 19)) != datas[19]) {
        console.log("CRC8校验异常：", crc8(datas.slice(0, 19)))
        return
    }
    //蓝牙数据包组包
    bleDatasBackArr = bleDatasBackArr.concat(datas.slice(2, 19))
    //如果是最后一包那就清空并返回给页面处理方法
    if (datas[1] >= 128) {
        let deepDatas = [];
        deepDatas = bleDatasBackArr;
        bleDatasBackArr = [];
        console.log("进行组包后的数据", deepDatas);
        // return deepDatas;
        datasBackToPage(deepDatas, "01");
    }
}


//cmd2 3查询蓝牙数据处理
//datas=[10, 2, 1, 1, 10, 2, 2, 0, 10, 3, 3, 232, 3, 10, 3, 4, 232, 3, 10, 3, 5, 255, 255, 10, 3, 6, 255, 255, 10, 7, 16, 255, 255, 255, 255, 255, 255]
//return {}
function resolveBleCmd23Datas(datas) {
    let re = {}
    for (let i = 1; i < datas.length;) {
        if (datas[i] == 0) {
            break;
        }
        //判断长度小于ff ff那就是数字，反之 字符串16进制
        if (datas[i] < 5) {
            let value = 0
            if (datas[i] == 2) {
                value = datas[i + 2]
            } else if (datas[i] == 3) {
                value = datas[i + 2] + datas[i + 3] * 256
            } else if (datas[i] == 4) {
                value = datas[i + 2] + datas[i + 3] * 256 + datas[i + 4] * 256 * 256
            }
            re[datas[i + 1]] = value

        } else {
            re[datas[i + 1]] = ""
            for (let k = 0; k < datas[i] - 1; k++) {
                re[datas[i + 1]] += (datas[i + k + 2] < 10 ? '0' + datas[i + k + 2].toString(16) : datas[i + k + 2].toString(16))
            }
            re[datas[i + 1]] = re[datas[i + 1]].toUpperCase()
        }

        i += datas[i] + 2
    }
    return re
}


//数字分割成255数组
function intTo255Arr(int) {
    let a = []
    if (int < 256) {
        a.push(int)
    } else {
        a.push(int % 256)
        a.push(parseInt(int / 256))
    }
    return a
}

//udp返回字节流转字符数组解析完成后返回给页面
function updMsgFix(arrayBuffer) {
    let unit8Arr = new Uint8Array(arrayBuffer);
    let encodedString = String.fromCharCode.apply(null, unit8Arr),
        decodedString = decodeURIComponent(escape((encodedString))); //没有这一步中文会乱码
    return decodedString;
}

// ArrayBuffer转为字符串，参数为ArrayBuffer对象
function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint16Array(buf));
}

/**
 * 将十进制数字转换为二进制
 * @param {string | number} num 
 * @returns  二进制数
 */
function toRadix2(num) {
    let radix2 = Number(num).toString(2);
    return radix2
}

module.exports = {
    setCurPage,
    getCurPage,
    sendDatas,
    clearDatas,
    getDeviceKey,
    getNetSetDatas,
    sendCmd,
    getBleDeviceKey,
    queryDevice,
    timestampToHexIntArray,
    getCmd0,
    bleDatasBack,
    datasBackToPage,
    intTo255Arr,
    hexStr2intArr,
    resolveBleCmd23Datas,
    ab2str,
    updMsgFix,
    toRadix2  //转二进制
}