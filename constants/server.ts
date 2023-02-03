
import { getAddressByEnv } from "../utils/util"
// 测试服务器地址
export const ADDRESS_TESTSEVER = 'http://test.doiting.com';
// 生产服务器地址
export const ADDRESS_ONLINESEVER = 'https://api-cn.doiting.com';
// 当前环境下的服务器地址（测试或生产）
export const ADDRESS_NOWENV = getAddressByEnv(ADDRESS_TESTSEVER, ADDRESS_ONLINESEVER);


// webSocket地址
export const ADDRESS_WEBSOCKET = 'wss://wss-cn.doiting.com/ws';
// websocket用户连接超时时间：单位ms（心跳包）
export const CONNECTION_WEBSOCKET_TIMEOUT = 30000;



// udp媒体服务器ip地址
export const ADDRESS_UDPSOCKET: string = getAddressByEnv('192.168.100.245', '8.135.109.78');
// udp端口号
export const PORT_AUDIO: number = 7896;
export const PORT_VIDEO: number = 7897;
// 内网下的udp端口号
export const PORT_LAN_AUDIO: number = 7898;
export const PORT_LAN_VIDEO: number = 7899;
// 通用控制udp长连接时间：单位ms（通用心跳包）
export const CONNECTION_TIMEOUT = 2000;
// udp视频通道用户连接超时时间：单位ms（心跳包）
export const CONNECTION_VIDEOCHANNEL_TIMEOUT = 2000;
// udp音频通道用户连接超时时间：单位ms（心跳包）
export const CONNECTION_AUDIOCHANNEL_TIMEOUT = 30;



