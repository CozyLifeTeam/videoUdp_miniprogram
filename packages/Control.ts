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
import { TCPSocket } from "./Tcp";


// 门铃SDK
// 策略：配置项：
// 1.高画质   720P
// 2.低画质   480P
// 3.自动切换 ---- 网络流畅就720P，不流畅就480P --- 以流畅性为主

// 帧率问题
// 设备不同的适配 --- 例如：720P 10帧 - 720P 20帧 主动去配置

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
    public volume: number = 1;
    public isRecordOn = false;
    public audioCtx = wx.createWebAudioContext();

    public udpVideoTimer: any        // 保持udp视频通信的定时器
    public udpAudioTimer: any        // 保持udp语音通信的定时器
    // public page: any
    constructor(MediaParam: MediaParam) {
        this.udpAudioSocket = new UDPSocket(MediaParam.UDPAudio);
        this.udpVideoSocket = new UDPSocket(MediaParam.UDPVideo);
        this.udpAudioSocket.bind();
        this.udpVideoSocket.bind();

        recorder.onStart(() => {
            console.log("麦克风开启");
            this.isRecordOn = true;
        })
        recorder.onStop(() => {
            console.log("麦克风关闭");
            this.isRecordOn = false;
        })
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
     * @param mode 分辨率模式
     */
    subscribeVideo(data: subscribeHeader, mode) {
        const { version, token, session_id, session_status } = data;

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
        // 将数据拼凑出来一个完整包
        const { version, token, session_id, session_status } = data
        const message = [
            ...new Array(1).fill(version),
            ...strToAscii(token).split(","),
            ...strToAscii(session_id).split(","),
            ...new Array(1).fill(session_status),
        ];

        // 是否开启麦克风 ? 发语音包 : 发心跳包
        // this.isRecordOn ? this.sendAudioBuff(message) : this.keepAudio(data);
        this.keepAudio(data)

        // 卸载监听器，避免重复创建监听器
        this.udpAudioSocket.offMessage();

        this.onMessageUDPAudio(res => {
            const view = pcm_wav(res, '8000', '16', '1');
            const audioSource = this.audioCtx.createBufferSource();

            this.audioCtx.decodeAudioData(view, (buffer) => {
                audioSource.buffer = buffer;
                const gainNode = this.audioCtx.createGain();
                gainNode.gain.value = this.volume;
                gainNode.connect(this.audioCtx.destination);
                audioSource.connect(gainNode);
                audioSource.start();
            }, err => {
                console.log(err, 23333)
            })
        })

        // 录音分帧，存入栈内等待发送
        recorder.onFrameRecorded(res => {
            const { frameBuffer } = res;
            // 性能优化，不要用concat
            this.stackAudio = [...this.stackAudio, ...ab2ToArr(frameBuffer)];

            // 等待全部发送完毕
            while (this.stackAudio.length >= 320) {
                const audioDataArr: any = [];
                if (this.stackAudio.length > 1280)
                    audioDataArr.push(...this.stackAudio.splice(0, 1280));
                else if (this.stackAudio.length > 960)
                    audioDataArr.push(...this.stackAudio.splice(0, 960));
                else if (this.stackAudio.length > 640)
                    audioDataArr.push(...this.stackAudio.splice(0, 640));
                else if (this.stackAudio.length > 320)
                    audioDataArr.push(...this.stackAudio.splice(0, 320));
                else return

                const messageArr = [...message, ...audioDataArr];
                // 发包
                this.udpAudioSocket.send(arrayToAb2(messageArr))
            }
        })
    }

    /**
     * 发送语音包
     * @param message 包头
     */
    sendAudioBuff(header) {
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
            else return

            const messageArr = [...header, ...audioDataArr];
            // 发包
            this.udpAudioSocket.send(arrayToAb2(messageArr))
        }, CONNECTION_AUDIOCHANNEL_TIMEOUT);
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
     * 发送音频心跳包
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
            // return;
            recorder.start(options);
            this.isRecordOn = true;
            this.subscribeAudio(data);
        }
        if (command == false) {
            this.stackAudio = [];
            recorder.stop();
            this.isRecordOn = false;
            this.subscribeAudio(data);
        }
    }

    /**
     * 开启/关闭扬声器
     * @param command 命令，true开启；false关闭
     */
    speakerState(command: boolean) {
        if (command == true) {
            this.volume = 1;
            console.log("开启扬声器");
        }
        if (command == false) {
            this.volume = 0;
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
        let pre = 0;
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
        // 初始化一些值
        this.stackAudio = [];
        this.volume = 1;
        console.log("closeMediaConnection, 结束音视频通话！");
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
        try {
            await wx.startWifi();
            const { wifi } = await wx.getConnectedWifi({});
            if (!wifi) {
                media = _media;
                reslove({
                    media: media,
                    state: '公网'
                });
                return;
            }
            console.log("开始搜索")
            // UDP广播帧搜索
            const UDPSearchInterval = setInterval(() => {
                LAN_UDP.searchDevice();
            }, 50);
            // for(let i = 0; i< 5; i++) {
            //     LAN_UDP.searchDevice();
            // }
            // 兜底 500ms后必须结束
            const initTimeout = setTimeout(() => {
                media = _media;
                clearInterval(UDPSearchInterval);
                reslove({
                    media: media,
                    state: '公网'
                });
                return;
            }, 500);
            LAN_UDP.onMessage(async (res) => {
                const { msg: { did, ip } } = res;
                if (device_id == did) {
                    // 初始化
                    media = LAN_Media;
                    LAN_Media.init(ip);
                    await TCPSocket.connect(ip, 5555);
                    // 卸载监听
                    clearInterval(UDPSearchInterval);
                    clearTimeout(initTimeout);
                    LAN_UDP.offMessage();
                    reslove({
                        media: media,
                        state: '内网'
                    });
                    return;
                }
            })
        } catch {
            media = _media;
            reslove({
                media: media,
                state: '公网'
            });
            return;
        }
    })
}

export const _media = new Media(option);
export const LAN_Media = new LAN_MediaClass();

export let media = new Media(option);

