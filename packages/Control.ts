import { ab2ToArr, arrayToAb2, strToAscii } from "../utils/util";
import { decryptVideo, decryptAudio, decryptResponse } from "../utils/decrypt";
import { pcm_wav } from "./pcm_to_wav";
import { LAN_UDP, UDPSocket } from "./Udp";
import WebSocket from "./WebSocket";
import {
    ADDRESS_UDPSOCKET,
    CONNECTION_AUDIOCHANNEL_TIMEOUT,
    CONNECTION_TIMEOUT,
    CONNECTION_VIDEOCHANNEL_TIMEOUT,
    PORT_AUDIO,
    PORT_VIDEO,
    PORT_LAN_AUDIO,
    PORT_LAN_VIDEO,
} from "../constants/server";
import { options, recorder } from "./RecorderManager";
import { InnerAudioContext } from "./InnerAudioContext";
import { fs } from "./FileSystemManager";

const option = {
    UDPAudio: {
        address: ADDRESS_UDPSOCKET,
        port: PORT_AUDIO
    },
    UDPVideo: {
        address: ADDRESS_UDPSOCKET,
        port: PORT_VIDEO
    }
}

interface subscribeHeader {
    version: string | number
    token: string
    session_id: string | number
    session_status: string | number
}

type MediaParam = {
    UDPAudio: WechatMiniprogram.UDPSocketConnectOption
    UDPVideo: WechatMiniprogram.UDPSocketConnectOption
}


class Media {
    public udpVideoSocket: UDPSocket
    public udpAudioSocket: UDPSocket
    public stackAudio: any[] = [];

    public udpVideoTimer: any        // 保持udp视频通信的定时器
    public udpAudioTimer: any        // 保持udp语音通信的定时器
    constructor(MediaParam: MediaParam) {
        this.udpAudioSocket = new UDPSocket(MediaParam.UDPAudio);
        this.udpVideoSocket = new UDPSocket(MediaParam.UDPVideo);
        this.udpAudioSocket.bind();
        this.udpVideoSocket.bind();
    }

    /**
     * 查询电量
     * @param device_id 
     * @param device_key 
     */
    queryElectricity(device_id, device_key) {
        const msg = {
            attr: [102]
        }
        WebSocket.assembleDataSend({ msg, cmd: 3, device_id, device_key })
    }

    /**
     * 呼叫设备
     * @param session_id 
     * @param device_id 
     * @param device_key 
     */
    callToDevice(session_id, device_id, device_key) {
        const msg = {
            attr: [110, 111, 112, 117],
            data: {
                110: session_id,
                111: 1,
                112: 3,
                117: 3
            }
        }
        WebSocket.assembleDataSend({ msg, cmd: 3, device_id, device_key })
    }

    /**
     * 3. udp订阅视频流
     * @param data 发送的数据
     */
    subscribeVideo(data: subscribeHeader) {
        const { version, token, session_id, session_status } = data
        // 将数据拼凑出来一个完整包
        let message: any = [
            ...new Array(1).fill(version),
            ...strToAscii(token).split(","),
            ...strToAscii(session_id).split(","),
            ...new Array(1).fill(session_status),
        ];
        // 将包转为ArrayBuffer，便于发包
        message = arrayToAb2(message);
        // 发包
        clearInterval(this.udpVideoTimer);
        this.udpVideoTimer = setInterval(() => {
            this.udpVideoSocket.send(message)
        }, CONNECTION_VIDEOCHANNEL_TIMEOUT)
    }


    /**
     * 3. udp订阅音频流 http://doc.doit/project-23/doc-266/
     * @param data 发送的数据
     */
    subscribeAudio(data: subscribeHeader) {
        let message: any;



        recorder.onFrameRecorded(res => {
            const { frameBuffer } = res;
            const { version, token, session_id, session_status } = data
            // 将数据拼凑出来一个完整包
            message = [
                ...new Array(1).fill(version),
                ...strToAscii(token).split(","),
                ...strToAscii(session_id).split(","),
                ...new Array(1).fill(session_status),
            ];
            this.stackAudio = this.stackAudio.concat(ab2ToArr(frameBuffer));
        })
        this.keepAudio(data);
        // 启动定时器
        clearInterval(this.udpAudioTimer);
        this.udpAudioTimer = setInterval(() => {
            let audioDataArr: any = [];
            if (this.stackAudio.length > 1280)
                audioDataArr = this.stackAudio.splice(0, 1280);
            else if (this.stackAudio.length > 960)
                audioDataArr = this.stackAudio.splice(0, 960);
            else if (this.stackAudio.length > 640)
                audioDataArr = this.stackAudio.splice(0, 640);
            else if (this.stackAudio.length > 320)
                audioDataArr = this.stackAudio.splice(0, 320);
            else return;

            const messageArr = [...message, ...audioDataArr];
            // 发包
            if (audioDataArr.length > 100) {
                this.udpAudioSocket.send(arrayToAb2(messageArr))
            }
        }, CONNECTION_AUDIOCHANNEL_TIMEOUT);
        // 打开麦克风
        recorder.start(options);
        const audioCtx = wx.createWebAudioContext();
        this.onMessageUDPAudio(res => {
            const view = pcm_wav(res, '8000', '16', '1');
            const audioSource = audioCtx.createBufferSource();

            audioCtx.decodeAudioData(view, (buffer) => {
                audioSource.buffer = buffer;
                var gainNode = audioCtx.createGain()
                gainNode.gain.value = 0.1 // 10 % 
                gainNode.connect(audioCtx.destination)

                audioSource.connect(gainNode);
                audioSource.start();
            }, err => {
                console.log(err, 23333)
            })
        })
    }

    /**
     * 视频接听
     */
    videoAnswer(session_id, device_id, device_key) {
        let msg = {
            attr: [109, 110, 112, 117],
            data: {
                109: 1,
                110: session_id,
                112: 3,
                117: 3 //内网通信+
            }
        }
        WebSocket.assembleDataSend({ msg, cmd: 3, device_id, device_key })
    }

    /**
     * 语音接听
     */
    audioAnswer(session_id, device_id, device_key) {
        let msg = {
            attr: [109, 110, 112, 117],
            data: {
                109: 1,
                110: session_id,
                112: 2,
                117: 3 //内网通信+公网通信
            }
        }
        WebSocket.assembleDataSend({ msg, cmd: 3, device_id, device_key })
    }

    noAnswer(session_id, device_id, device_key) {
        let msg = {
            attr: [109, 110],
            data: {
                109: 2,
                110: session_id,
            }
        }
        WebSocket.assembleDataSend({ msg, cmd: 3, device_id, device_key })
    }

    /**
     * 5. ws关闭媒体流连接（销毁该session_id）
     */
    closeMediaConnection(data: subscribeHeader, device_id, device_key) {
        const { version, token, session_id, session_status } = data;
        const msg = {
            attr: [110, 113],
            data: {
                110: session_id,
                113: 1          //用户主动关闭连接
            }
        }
        WebSocket.assembleDataSend({ msg, cmd: 3, device_id, device_key })
        // 移除定时器
        clearInterval(this.udpAudioTimer);
        clearInterval(this.udpVideoTimer);
        // 移除监听
        this.udpVideoSocket.offMessage();
        this.udpAudioSocket.offMessage();
        // 停止一些服务
        recorder.stop();
        InnerAudioContext.stop();
        // 初始化一些值
        this.stackAudio = [];
        console.log("closeMediaConnection, 结束音视频通话！");
    }

    /**
     * 关闭音频，（但仍发送心跳包保持udp连接
     * @param data 
     */
    keepAudio(data: subscribeHeader) {
        const { version, token, session_id, session_status } = data;
        const message: any = [
            ...new Array(1).fill(version),
            ...strToAscii(token).split(","),
            ...strToAscii(session_id).split(","),
            ...new Array(1).fill(session_status),
        ];
        clearInterval(this.udpAudioTimer);
        this.udpAudioTimer = setInterval(() => {
            this.udpAudioSocket.send(arrayToAb2(message))
        }, CONNECTION_TIMEOUT)
    }

    /**
     * 开启/关闭麦克风
     * @param command 命令，true开启；false关闭
     */
    microState(command: boolean, data: subscribeHeader) {
        if (command == true) {
            wx.showLoading({
                title: "请稍等..."
            });
            this.subscribeAudio(data)
            wx.hideLoading();
            console.log("开启麦克风");
        }
        if (command == false) {
            this.keepAudio(data);
            recorder.stop();
            console.log("关闭麦克风");
        }
    }

    /**
     * 开启/关闭扬声器
     * @param command 命令，true开启；false关闭
     */
    speakerState(command: boolean) {
        if (command == true) {
            InnerAudioContext.volume = 1;
            console.log("开启扬声器");
        }
        if (command == false) {
            InnerAudioContext.volume = 0;
            console.log("关闭扬声器");
        }
    }

    /**
     * udpVideo的监听回调函数
     * @param fn 外部使用箭头函数
     */
    onMessageUDPVideo(fn: Function) {

        this.udpVideoSocket.onMessage(res => {

            decryptVideo(res).then(video => {

                const base64Img = wx.arrayBufferToBase64(video as ArrayBufferLike);
                fn(base64Img);
            }).catch((err) => {
                // console.log(err, "报错了捏video");
            });
        })
    }

    /**
     * udpAudio的监听回调函数
     * @param fn 外部使用箭头函数
     */
    onMessageUDPAudio(fn: Function) {
        this.udpAudioSocket.onMessage(res => {
            decryptAudio(res).then(res => {
                fn(res);
            }).catch((err) => {
                // console.log(err);
            })
        })
    }
}


/**
 * 内网直连
 */
class LAN_MediaClass extends Media {
    public TCPSocket: WechatMiniprogram.TCPSocket;
    constructor(MediaParam: MediaParam = option) {
        super(MediaParam)
        this.TCPSocket = wx.createTCPSocket();
    }



    init(ip) {
        return new Promise((reslove, reject) => {
            // udp方面
            this.udpAudioSocket.close();
            this.udpVideoSocket.close();
            this.udpAudioSocket = new UDPSocket({
                address: ip,
                port: PORT_LAN_AUDIO
            });
            this.udpVideoSocket = new UDPSocket({
                address: ip,
                port: PORT_LAN_VIDEO
            });
            this.udpAudioSocket.bind();
            this.udpVideoSocket.bind();
            // tcp方面
            this.TCPSocket.connect({
                address: ip,
                port: 5555
            })
            this.TCPSocket.onConnect(res => {
                reslove(res)
            })
            // 初始化media
            media = LAN_Media;
        })
    }

    /**
     * 查询电量
     * @param device_id 
     * @param device_key 
     */
    queryElectricity(device_id, device_key) {
        const msg = {
            cmd: 3,
            pv: 0,
            sn: "" + new Date().getTime(),
            msg: {
                attr: [102]
            }
        }
        this.TCPSocket.write(JSON.stringify(msg) + '\r' + '\n');
    }

    /**
     * 呼叫设备
     * @param session_id 
     * @param device_id 
     * @param device_key 
     */
    callToDevice(session_id, device_id, device_key) {
        const msg = {
            cmd: 3,
            pv: 0,
            sn: "" + new Date().getTime(),
            msg: {
                attr: [110, 111, 112, 117],
                data: {
                    110: session_id,
                    111: 1,
                    112: 3,
                    117: 1
                }
            }
        }
        this.TCPSocket.write(JSON.stringify(msg) + '\r' + '\n');
    }

    /**
     * 3. udp订阅视频流
     * @param data 发送的数据
     */
    subscribeVideo(data: subscribeHeader) {
        const { version, token, session_id, session_status } = data
        // 将数据拼凑出来一个完整的包并转为ArrayBuffer
        let message: any = [
            ...new Array(1).fill(version),
            ...strToAscii(token).split(","),
            ...strToAscii(session_id).split(","),
            ...new Array(1).fill(session_status),
        ];
        message = arrayToAb2(message);
        // 发包
        clearInterval(this.udpVideoTimer);
        this.udpVideoTimer = setInterval(() => {
            this.udpVideoSocket.send(message)
        }, CONNECTION_VIDEOCHANNEL_TIMEOUT)
    }


    /**
     * 3. udp订阅音频流 http://doc.doit/project-23/doc-266/
     * @param data 发送的数据
     */
    subscribeAudio(data: subscribeHeader) {
        let message: any;
        recorder.onFrameRecorded(res => {
            const { frameBuffer } = res;
            const { version, token, session_id, session_status } = data
            // 将数据拼凑出来一个完整包
            message = [
                ...new Array(1).fill(version),
                ...strToAscii(token).split(","),
                ...strToAscii(session_id).split(","),
                ...new Array(1).fill(session_status),
            ];
            this.stackAudio = this.stackAudio.concat(ab2ToArr(frameBuffer));
        })
        this.keepAudio(data);
        // 启动定时器
        clearInterval(this.udpAudioTimer);
        this.udpAudioTimer = setInterval(() => {
            let audioDataArr: any = [];
            if (this.stackAudio.length > 1280)
                audioDataArr = this.stackAudio.splice(0, 1280);
            else if (this.stackAudio.length > 960)
                audioDataArr = this.stackAudio.splice(0, 960);
            else if (this.stackAudio.length > 640)
                audioDataArr = this.stackAudio.splice(0, 640);
            else if (this.stackAudio.length > 320)
                audioDataArr = this.stackAudio.splice(0, 320);
            else return;

            const messageArr = [...message, ...audioDataArr];
            // 发包
            if (audioDataArr.length > 100) {
                this.udpAudioSocket.send(arrayToAb2(messageArr))
            }
        }, CONNECTION_AUDIOCHANNEL_TIMEOUT);
        // 打开麦克风
        recorder.start(options);
        const audioCtx = wx.createWebAudioContext();
        this.onMessageUDPAudio(res => {
            const view = pcm_wav(res, '8000', '16', '1');
            const audioSource = audioCtx.createBufferSource();
            audioCtx.decodeAudioData(view, (buffer) => {
                audioSource.buffer = buffer;
                audioSource.connect(audioCtx.destination);
                audioSource.start();
            }, err => {
                console.log(err, 23333)
            })
        })
    }

    /**
     * 视频接听
     */
    videoAnswer(session_id) {
        const msg = {
            cmd: 3,
            pv: 0,
            sn: "" + new Date().getTime(),
            msg: {
                attr: [109, 110, 112, 117],
                data: {
                    109: 1,
                    110: session_id,
                    112: 3,
                    117: 1
                }
            }
        }
        this.TCPSocket.write(JSON.stringify(msg) + '\r' + '\n');
    }

    /**
     * 语音接听
     */
    audioAnswer(session_id) {
        const msg = {
            cmd: 3,
            pv: 0,
            sn: "" + new Date().getTime(),
            msg: {
                attr: [109, 110, 112, 117],
                data: {
                    109: 1,
                    110: session_id,
                    112: 2,
                    117: 1
                }
            }
        }
        this.TCPSocket.write(JSON.stringify(msg) + '\r' + '\n');
    }

    noAnswer(session_id, device_id, device_key) {
        const msg = {
            cmd: 3,
            pv: 0,
            sn: "" + new Date().getTime(),
            msg: {
                attr: [109, 110],
                data: {
                    109: 2,
                    110: session_id,
                }
            }
        }
        this.TCPSocket.write(JSON.stringify(msg) + '\r' + '\n');
    }

    /**
     * 5. ws关闭媒体流连接（销毁该session_id）
     */
    closeMediaConnection(data: subscribeHeader, device_id, device_key) {
        const { version, token, session_id, session_status } = data;

        const msg = {
            cmd: 3,
            pv: 0,
            sn: "" + new Date().getTime(),
            msg: {
                attr: [110, 113],
                data: {
                    110: session_id,
                    113: 1          //用户主动关闭连接
                }
            }
        }
        this.TCPSocket.write(JSON.stringify(msg) + '\r' + '\n');
        // 移除定时器
        clearInterval(this.udpAudioTimer);
        clearInterval(this.udpVideoTimer);
        // 移除监听
        this.udpVideoSocket.offMessage();
        this.udpAudioSocket.offMessage();
        // 停止一些服务
        recorder.stop();
        InnerAudioContext.stop();
        // 初始化一些值
        this.stackAudio = [];
        console.log("closeMediaConnection, 结束音视频通话！");
    }

    /**
     * 关闭音频，（但仍发送心跳包保持udp连接
     * @param data 
     */
    keepAudio(data: subscribeHeader) {
        const { version, token, session_id, session_status } = data;
        const message: any = [
            ...new Array(1).fill(version),
            ...strToAscii(token).split(","),
            ...strToAscii(session_id).split(","),
            ...new Array(1).fill(session_status),
        ];
        clearInterval(this.udpAudioTimer);
        this.udpAudioTimer = setInterval(() => {
            this.udpAudioSocket.send(arrayToAb2(message))
        }, CONNECTION_TIMEOUT)
    }

    /**
     * 开启/关闭麦克风
     * @param command 命令，true开启；false关闭
     */
    microState(command: boolean, data: subscribeHeader) {
        if (command == true) {
            wx.showLoading({
                title: "请稍等..."
            });
            this.subscribeAudio(data)
            wx.hideLoading();
            console.log("开启麦克风");
        }
        if (command == false) {
            this.keepAudio(data);
            recorder.stop();
            console.log("关闭麦克风");
        }
    }

    /**
     * 开启/关闭扬声器
     * @param command 命令，true开启；false关闭
     */
    speakerState(command: boolean) {
        if (command == true) {
            InnerAudioContext.volume = 1;
            console.log("开启扬声器");
        }
        if (command == false) {
            InnerAudioContext.volume = 0;
            console.log("关闭扬声器");
        }
    }

    /**
     * udpVideo的监听回调函数
     * @param fn 外部使用箭头函数
     */
    onMessageUDPVideo(fn: Function) {

        this.udpVideoSocket.onMessage(res => {

            decryptVideo(res).then(video => {

                const base64Img = wx.arrayBufferToBase64(video as ArrayBufferLike);
                fn(base64Img);
            }).catch((err) => {
                // console.log(err, "报错了捏video");
            });
        })
    }

    /**
     * udpAudio的监听回调函数
     * @param fn 外部使用箭头函数
     */
    onMessageUDPAudio(fn: Function) {
        this.udpAudioSocket.onMessage(res => {
            decryptAudio(res).then(res => {
                fn(res);
            }).catch((err) => {
                // console.log(err);
            })
        })
    }
}

/**
 * 初始化 - 选择是内网直连还是公网，
 * 默认是优先内网
 * @param isLAN 是否需要内网(自动判断能否内网，不能则还是公网)
 */
export function init(device_id, isLAN = true) {
    return new Promise(async (reslove, reject) => {
        if (!isLAN) {
            media = _media;
            reslove({
                media: media,
                state: '公网'
            });
            return;
        }
        // 当前是否开启wifi
        const { wifi } = await wx.getConnectedWifi({});
        if (!wifi) {
            media = _media;
            reslove({
                media: media,
                state: '公网'
            });
            return;
        }
        // 判定500ms后结束
        const initTimeout = setTimeout(() => {
            media = _media;
            clearInterval(UDPSearchInterval);
            reslove({
                media: media,
                state: '公网'
            });
            return;
        }, 500);
        // UDP广播帧搜索
        const UDPSearchInterval = setInterval(() => {
            LAN_UDP.searchDevice();
        }, 50);
        LAN_UDP.onMessage(res => {
            const { msg: { did, ip } } = res;
            if (device_id == did) {
                media = LAN_Media;
                LAN_Media.init(ip);
                clearInterval(UDPSearchInterval);
                clearTimeout(initTimeout);
                reslove({
                    media: media,
                    state: '内网'
                });
                return;
            }
        })
    })
}

export const _media = new Media(option)
export const LAN_Media = new LAN_MediaClass()
export let media;
