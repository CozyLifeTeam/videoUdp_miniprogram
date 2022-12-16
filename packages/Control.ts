import { ab2ToArr, arrayToAb2, strToAscii } from "../utils/util";
import { decryptVideo, decryptAudio, decryptResponse } from "../utils/decrypt";
import { hexMD5 } from "./md5"
import { pcm_wav } from "./pcm_to_wav";
import { UDPSocket } from "./Udp";
import { WebSocket } from "./WebSocket";
import {
    ADDRESS_UDPSOCKET,
    ADDRESS_ONLINESEVER,
    ADDRESS_WEBSOCKET,
    CONNECTION_AUDIOCHANNEL_TIMEOUT,
    CONNECTION_TIMEOUT,
    CONNECTION_VIDEOCHANNEL_TIMEOUT,
    PORT_AUDIO,
    PORT_VIDEO,
    CONNECTION_WEBSOCKET_TIMEOUT
} from "../constants/server";
import { options, recorder } from "./RecorderManager";
import { InnerAudioContext } from "./InnerAudioContext";
import { FileSystemManager } from "./FileSystemManager";
import { TOAST_NETWORKBAD } from "../constants/config";

interface subscribeHeader {
    version: string | number
    token: string
    session_id: string | number
    session_status: string | number
}

type MediaParam = {
    wsAddress: string,
    UDPAudio: WechatMiniprogram.UDPSocketConnectOption
    UDPVideo: WechatMiniprogram.UDPSocketConnectOption
}

class Media {
    public udpVideoSocket: UDPSocket
    public udpAudioSocket: UDPSocket
    public wsSocket: WebSocket
    public wsSocketTimer: any        // 保持websocket的定时器
    public udpVideoTimer: any        // 保持udp视频通信的定时器
    public udpAudioTimer: any        // 保持udp语音通信的定时器
    public device_id: any
    public device_key: any
    public stackAudio: any[] = [];
    public fs = new FileSystemManager();

    private isOnMessaeWS: boolean = false

    constructor(MediaParam: MediaParam) {
        this.udpAudioSocket = new UDPSocket(MediaParam.UDPAudio);
        this.udpVideoSocket = new UDPSocket(MediaParam.UDPVideo);
        this.wsSocket = new WebSocket(MediaParam.wsAddress);
        this.udpAudioSocket.bind();
        this.udpVideoSocket.bind();
    }


    /**
     * 1. ws订阅指定设备device_id
     */
    subcribe(device_id: string, device_key: string) {
        this.wsSocket.connectSocket().then(res => {
            console.log(res);

            this.wsSocket.onOpen(() => {
                this.device_id = device_id;
                this.device_key = device_key;
                this.wsSocket.ws_send(`cmd=subscribe&topic=device_${device_id}&from=control&device_id=${device_id}&device_key=${device_key}`)
                this.queryElectricity();
                // 发送心跳包，保持websocket连接
                clearInterval(this.wsSocketTimer)
                this.wsSocketTimer = setInterval(() => {
                    this.wsSocket.ws_send(`cmd=ping`)
                }, CONNECTION_WEBSOCKET_TIMEOUT)
            })
        })
    }

    /**
     * 查询电量
     */
    queryElectricity() {
        const msg = {
            attr: [102]
        }
        this.assembleDataSend(JSON.stringify(msg), 2)
    }

    /**
     * 2. ws组装要发送的信息并发送
     * @param msg 要发送的信息
     * @param cmd 命令
     */
    assembleDataSend(msg, cmd) {
        const timestamp1 = Date.parse(new Date() as any);
        const message = `cmd=publish&topic=control_${this.device_id}&device_id=${this.device_id}&device_key=${this.device_key}&message={"cmd":${cmd},"pv":0,"sn":"${timestamp1}","msg":${msg}}`;

        console.log("通过 socket 发送的 message :", message);
        this.wsSocket.ws_send(message)
    }

    /**
     * 呼叫设备
     * @param session_id 
     */
    callToDevice(session_id) {
        const msg = {
            attr: [110, 111, 112],
            data: {
                110: session_id,
                111: 1,
                112: 3,
            }
        }
        this.assembleDataSend(JSON.stringify(msg), 3);
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
        this.onMessageUDPAudio(res => {
            const dateNow = Date.now();
            const view = pcm_wav(res, '8000', '16', '1');
            this.fs.writeFile(view, `${wx.env.USER_DATA_PATH}/${dateNow}.wav`).then(() => {
                InnerAudioContext.src = `${wx.env.USER_DATA_PATH}/${dateNow}.wav`;
                InnerAudioContext.play();
            }).catch(() => { })
        })
    }

    /**
     * 视频接听
     */
    videoAnswer(session_id) {
        let msg = {
            attr: [109, 110, 112, 117],
            data: {
                109: 1,
                110: session_id,
                112: 3,
                117: 3 //内网通信+
            }
        }
        this.assembleDataSend(JSON.stringify(msg), 3);
    }

    /**
     * 语音接听
     */
    audioAnswer(session_id) {
        let msg = {
            attr: [109, 110, 112, 117],
            data: {
                109: 1,
                110: session_id,
                112: 2,
                117: 3 //内网通信+公网通信
            }
        }
        this.assembleDataSend(JSON.stringify(msg), 3);
    }

    noAnswer(session_id) {
        let msg = {
            attr: [109, 110],
            data: {
                109: 2,
                110: session_id,
            }
        }
        this.assembleDataSend(JSON.stringify(msg), 3);
    }

    /**
     * 5. ws关闭媒体流连接（销毁该session_id）
     */
    closeMediaConnection(data: subscribeHeader) {
        const { version, token, session_id, session_status } = data;
        const msg = {
            attr: [110, 113],
            data: {
                110: session_id,
                113: 1          //用户主动关闭连接
            }
        }
        this.assembleDataSend(JSON.stringify(msg), 3);
        // 发送心跳包保持连接，（视频也一直在发）
        this.keepAudio(data);
        // 移除监听
        this.udpVideoSocket.offMessage();
        this.udpAudioSocket.offMessage();
        // 停止一些服务
        recorder.stop();
        InnerAudioContext.stop();
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
     * websocket的监听回调函数
     * @param fn 外部使用箭头函数
     */
    onMessageWS(fn: Function) {
        if (this.isOnMessaeWS == true) return;
        this.isOnMessaeWS = true;

        this.wsSocket.ws.onMessage(res => {
            console.log(res);

            const response = decryptResponse(res.data);
            // 订阅时
            if (typeof (response) == "string") {
                if (
                    response.includes('res=0') ||
                    response.includes('num=0')
                ) {
                    fn({ res: "转发消息失败" });
                }
                else {
                    fn({ res: "订阅设备成功" });
                }
            }
            // 正常消息
            if (typeof (response) == "object") {
                // console.log(response);
                // http://doc.doit/project-5/doc-8/
                const {
                    device_request_call,
                    electricity,
                    device_request_call_reason,
                    session_id,
                    user_call,
                    call_type,
                    user_close_reason,
                    device_close_reason,
                    video_resolution,
                    video_fps,
                    device_answer,
                } = response

                if (device_request_call == 1) {
                    fn({
                        res: "设备发起呼叫",
                        session_id: session_id
                    });
                }
                else if (electricity) {
                    fn({
                        res: "查询设备电量",
                        electricity,
                        session_id: undefined
                    })
                }
                else if (device_answer == 1) {
                    fn({
                        res: "设备应答呼叫",
                        session_id: session_id
                    });
                }
                else if (device_answer == 2) {
                    fn({
                        res: "设备拒绝呼叫",
                        session_id: session_id
                    });
                }
                else if (user_close_reason == 1) {
                    fn({
                        res: "用户关闭session",
                        session_id: session_id
                    })
                }
                else if (device_close_reason == 1) {
                    fn({
                        res: "接听超时",
                        session_id: session_id
                    })
                }
                else if (device_close_reason == 2) {
                    fn({
                        res: "连接超时",
                        session_id: session_id
                    })
                }
                else {
                    fn({
                        res: "解析错误！请打印response看看什么问题"
                    })
                }
            }
            // 解析格式错误
            if (typeof (response) == "undefined") {
                fn({
                    res: "解析错误！请打印res看看什么问题"
                });
            }
        })
    }


    /**
     * udpVideo的监听回调函数
     * @param fn 外部使用箭头函数
     */
    onMessageUDPVideo(fn: Function) {
        
        this.udpVideoSocket.onMessage(res => {
            // console.log(res);
            
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
 * 网络差的情况
 */
function networkBad() {
    wx.showToast({
        title: "网络不佳",
        icon: "none",
        duration: 1500
    })
}


const option = {
    wsAddress: ADDRESS_WEBSOCKET,
    UDPAudio: {
        address: ADDRESS_UDPSOCKET,
        port: PORT_AUDIO
    },
    UDPVideo: {
        address: ADDRESS_UDPSOCKET,
        port: PORT_VIDEO
    }
}
export const media = new Media(option)