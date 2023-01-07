
import { ab2ToArr, hexToStr } from "./util";
/**
 * 校验UUID是否符合规则
 * @param uuid 设备uuid
 */
export function uuidCheck(uuid) {
    let reg = /0000([0-9a-f][0-9a-f][0-9a-f][0-9a-f])-0000-1000-8000-00805f9b34fb/
    return uuid.length > 0 && reg.test(uuid.toLocaleLowerCase())
}

/**
 * byte数组转字符
 * @param arr byte数组
 */
export function Uint8ToStr(arr) {
    for (var i = 0, str = ''; i < arr.length; i++)
        str += String.fromCharCode(arr[i]);
    return str;
}

/**
 * 将二进制转为十六进制 mac地址
 * @param macArr 二进制数组
 */
export function macHex(macArr) {
    var hexArr = new Array();
    for (var i = 0; i < macArr.length; i++) {
        var str = macArr[i];
        if (str < 16) {
            str = "0" + str.toString(16)
        } else {
            str = str.toString(16)
        }
        hexArr.push(str.toUpperCase())
    }

    return hexArr.join(':');
}

/**
 * 根据PID从数据模型中获取数据对象信息
 * @param pid 设备的pid
 */
export function getDeviceByPid(pid) {
    let app = getApp()
    let list = app.globalData.deviceModel || wx.getStorageSync('deviceModel');
    if (list.length < 1 || pid.length < 1) return

    for (let i = 0; i < list.length; i++) {
        for (let j = 0; j < list[i].device_model.length; j++) {
            if (list[i].device_model[j].device_product_id == pid) {
                return list[i].device_model[j]
            }
        }
    }
}




const STACKAUDIO_LENGTH = 5120;

interface stack {
    clearStack: Function
}
class stackVideoImpl implements stack {
    public frame_index: string | number = 0
    public imageContent: any[] = []
    clearStack() {
        this.frame_index = 0;
        this.imageContent = [];
    }
    setContent(chunk_index: any, imageContent: any) {
        // 如果该分包序号为空，则赋值
        if (this.imageContent[chunk_index] == undefined) {
            this.imageContent[chunk_index] = imageContent;
        }
        // 如果该分包序号不为空，则说明是第二次甚至第三次循环，应加255 + 1
        else {
            this.setContent(chunk_index + 256, imageContent);
        }
    }
    getContent(): number[] {
        return this.imageContent.reduce((prev, cur) => {
            return prev.concat(cur)
        })
    }
}
class stackAudioImpl implements stack {
    public audioContent = [];

    clearStack() {
        this.audioContent.splice(0, STACKAUDIO_LENGTH - 1280);
    }
    setContent(audioContent: any[]) {
        this.audioContent = this.audioContent.concat(audioContent as any)
    }
    getContent(): number[] {
        return this.audioContent
    }
}



// http://doc.doit/project-23/doc-263/
let stackVideo = new stackVideoImpl();
export function decryptVideo(message: ArrayBufferLike) {

    return new Promise((reslove, reject) => {
        const len = message.byteLength;
        let subPackage = {
            version: handleAb2(message.slice(0, 1)),
            device_id: handleAb2(message.slice(1, 21), true),
            session_id: handleAb2(message.slice(21, 25), true),
            session_status: handleAb2(message.slice(25, 26)),
            frame_index: handleAb2(message.slice(26, 27)),
            chunk_index: handleAb2(message.slice(27, 28)),
            chunk_last: handleAb2(message.slice(28, 29)),
            imageContent: ab2ToArr(message.slice(29, len))
        }
        // const now = Date.now();
        // console.log(stackVideo.frame_index, subPackage.frame_index, "frame_index", now - pre);
        // console.log(stackVideo.imageContent, subPackage.imageContent, "imageContent");
        // console.log(subPackage.chunk_index, "本次的chunk_index", now - pre);
        // console.log("1.本次分包的解密信息：", subPackage);
        // pre = now;

        // 如果帧序不等于当前帧，则丢弃当前帧，只要最新帧
        if (subPackage.frame_index !== stackVideo.frame_index) {
            stackVideo.clearStack();
            stackVideo.frame_index = subPackage.frame_index;
        }
        // 进行分包排序
        stackVideo.setContent(subPackage.chunk_index, subPackage.imageContent);

        // 该帧接收完毕
        if (
            subPackage.chunk_last == 1 &&
            !isArrayHasUndefined(stackVideo.imageContent)
        ) {
            let video = arrayToAb2(stackVideo.getContent());
            stackVideo.clearStack();
            reslove(video);
        }
        if (subPackage.session_status == 0) {
            reject("通话关闭")
        }
    })
}

// http://doc.doit/project-23/doc-264/
let stackAudio = new stackAudioImpl();
export function decryptAudio(message: ArrayBufferLike) {
    return new Promise((reslove, reject) => {
        const len = message.byteLength,
            // version = message.slice(0, 1),
            // device_id = message.slice(1, 21),
            // session_id = message.slice(21, 25),
            // session_status = message.slice(25, 26),
            audioContent = ab2ToArr(message.slice(26, len));

        stackAudio.setContent(audioContent);

        if (stackAudio.audioContent.length >= STACKAUDIO_LENGTH) {
            let audio = arrayToAb2(stackAudio.getContent());
            stackAudio.clearStack();
            reslove(audio)
        }
        else {
            reject(`数量小于 ${STACKAUDIO_LENGTH} :` + stackAudio.audioContent.length)
        }
    })

}

type decryptResponse = {
    device_request_call: number | undefined
    electricity: number | undefined
    device_request_call_reason: number | undefined
    session_id: string | undefined
    user_answer: number | undefined
    user_call: number | undefined
    call_type: number | undefined
    user_close_reason: number | undefined
    device_close_reason: number | undefined
    video_resolution: number | undefined
    video_fps: number | undefined
    device_answer: number | undefined
}


/**
 * 解析websocket收到的消息 http://doc.doit/project-5/doc-1/
 * @param deviceResponse 设备的应答信息
 */
export function decryptWSMessage(deviceResponse) {
    const response = deviceResponse
        .split("&")
        .map((item) =>
            item.split("=")
                .map((item) => {
                    if (item.includes("{")) return item;
                    return `"${item}"`;
                })
                .join(":")
        )
        .join()
        .replace(/\ +/g, '')
        .replace(/[\r\n]/g, '');

    const { cmd, device_id, topic, message, res, num } = JSON.parse(`{${response}}`);

    const dpid = message?.msg?.data;
    return {
        cmd,
        device_id,
        dpid,
        res,
        num
    }
}


/**
 * 门铃：解密设备端的应答信息 http://doc.doit/project-5/doc-8/
 * @param deviceResponse 设备的应答信息
 */
export function decryptResponse(dpid): decryptResponse {
    return {
        device_request_call: dpid["101"],
        electricity: dpid["102"],
        device_request_call_reason: dpid["107"],
        user_answer: dpid["109"],
        session_id: dpid["110"],
        user_call: dpid["111"],
        call_type: dpid["112"],
        user_close_reason: dpid["113"],
        device_close_reason: dpid["114"],
        video_resolution: dpid["115"],
        video_fps: dpid["116"],
        device_answer: dpid["119"]
    }
}

/**
 * 将扫描包中有用的数据解密出来，并重新合并进去
 * @param {*} device 查找到的新设备
 * @returns {device} 解密后的设备
 */
export function decryptDevice(device) {
    let { serviceData, advertisServiceUUIDs, advertisData } = device;
    serviceData = new Uint8Array(serviceData[advertisServiceUUIDs[0]]);
    advertisData = new Uint8Array(advertisData);

    if (uuidCheck(advertisServiceUUIDs[0]) && serviceData[1] != 0) {
        // 将有用的数据解密出来，并合并进去, 后续会用到
        let pid = serviceData.slice(2, 8);
        let mac = getApp().globalData.ios ? serviceData.slice(8, 14) : serviceData.slice(8, 14).reverse();
        let info = getDeviceByPid(Uint8ToStr(pid));

        let decryptedDeviceInfo = {
            pid: Uint8ToStr(pid),
            mac: macHex(mac),
            net_type: serviceData[1],
            isBinded: advertisData[0],
            icon: info?.icon,
            device_model_name: info?.device_model_name
        }

        Object.assign(device, decryptedDeviceInfo);
    }

    // console.log("[ok]2.5.2 将该设备数据清洗完毕：", device);
    return device as never
}


// arrayBuffer处理方法
function handleAb2(ab2: ArrayBufferLike, isStr: boolean = false): string | number {
    // 首先转数组
    let arr = ab2ToArr(ab2);
    // 然后16进制转字符串
    if (isStr) {
        arr = arr.map(item => {
            return hexToStr(item);
        })
    }
    // 最后拼接起来
    return arr.join("")
}

function arrayToAb2(arr: any[]) {
    let buffer = new ArrayBuffer(arr.length);
    let view = new Uint8Array(buffer)
    for (let i = 0; i < arr.length; i++) {
        view[i] = Number(arr[i]);
    }
    return buffer
}

function isArrayHasUndefined(arr: any[]): boolean {
    for (let i = 0; i < arr.length; i++) {
        const element = arr[i];
        if (element == undefined) return true
    }
    return false
}




