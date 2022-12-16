function getPathByMpaasUrl(id){
    let path={
        //氛围灯---start
        "2021071315280034": "/subPac/iridescenceHalfCircle/pages/index/index",
        "2021072310010036": "/subPac/iridescenceHalfCircle/pages/index/index",
        "2021072310020037": "/subPac/iridescenceHalfCircle/pages/index/index",
        //氛围灯---end
        //调色遥控器---start
        "2021110216490051": "/subPac/remote/pages/index/index",
        //调色遥控器---end
        //幻彩系列---start
        "2020121211331234": "/subPac/iridescence/pages/index/index",
        "2021081318240040": "/subPac/iridescence/pages/index/index",
        "2021062117130028": "/subPac/iridescence/pages/index/index",
        "2021060316580018": "/subPac/iridescence/pages/index/index",
        "2021080516090039": "/subPac/iridescence/pages/index/index",
        "2021081318240040": "/subPac/iridescence/pages/index/index",
        "2021091714160042": "/subPac/iridescence/pages/index/index",
        "2021101811130046": "/subPac/iridescence/pages/index/index",
        "2021101916560047": "/subPac/iridescence/pages/index/index",
        "2021101916580048": "/subPac/iridescence/pages/index/index",
        "2021102618400049": "/subPac/iridescence/pages/index/index",
        "2021061018120023": "/subPac/iridescence/pages/index/index",
        //幻彩系列---end
        //单路计量插座系列---start
        "2021072815080038": "/subPac/socket_1_count/pages/index/index",
        "2021111617490052": "/subPac/socket_1_count/pages/index/index",
        //单路计量插座系列---end
        //2路普通开关系列---start
        "2021092814340043": "/subPac/socket_2/pages/index/index",
        "2021101315520045": "/subPac/socket_2/pages/index/index",
        "2021101315490044": "/subPac/socket_2/pages/index/index",
        //2路普通开关系列---end
         //五路球泡灯---start
        "2020101401110009":"/subPac/DoHomeLight/pages/index/index", 
        "2021010514220001":"/subPac/doHomeSecondBulb/pages/index/index", 
        "2021030515410003":"/subPac/doHomeThirdBulb/pages/index/index",
         //五路球泡灯---end
         //三路灯带---start
        "2020101401111009":"/subPac/DoHomeLightStrip/pages/index/index",
        "2020101401112009":"/subPac/doHomeSecondStrip/pages/index/index",
        "2021030310310002":"/subPac/doHomeThirdStrip/pages/index/index",
        //三路灯带---end
        //三路插座---start
        "2020101401121009":"/subPac/socket3/pages/index/index",
        //三路插座---end
        //四路插座---start
        "2021042809570014":"/subPac/socket_4/pages/index/index",
        //四路插座---end
        //一路插座---start
        "2021061611430026":"/subPac/socket/pages/index/index",
        "2020101401120009":"/subPac/socket/pages/index/index",
        //一路插座---end
        //二路球泡灯---start
        "2021030914310005":"/subPac/twoWayBulb1/pages/index/index",
        "2021030911280004":"/subPac/twoWayBulb1/pages/index/index",
        //二路球泡灯---end
        //一路球泡灯---start
        "2021031017390007":"/subPac/oneWayBulb1/pages/index/index",
        "2021031010180006":"/subPac/oneWayBulb2/pages/index/index",
        //一路球泡灯---end

        //化妆镜
        "2022061616440083":"/subPac/twoWayBulb1/pages/index/index",

        // 智慧门铃
        "2022120717410109": "/subPac/bell/pages/index/index",
        "202211171700": "/subPac/bell/pages/index/index"
    }
    return path[id] != undefined ? path[id] : '' ;
}
export {
    getPathByMpaasUrl
}