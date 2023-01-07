// pages/setting/setting.ts
Page({

    /**
     * 页面的初始数据
     */
    data: {
        list: [
            {
                title: "红外补光",
                checked: false
            },
            {
                title: "人体移动检测",
                checked: false
            },
            {
                title: "低电量提醒",
                checked: false
            },
            {
                title: "公众号推送",
                checked: false
            },
            {
                title: "APP推送",
                checked: false
            },
            {
                title: "免打扰时间",
                checked: false
            },
        ]
    },
    switch1Change({ detail: { value }, currentTarget: { dataset: { title } } }) {
        console.log(value, title);
        
    },
    
    /**
     * 生命周期函数--监听页面加载
     */
    onLoad() {

    },

    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady() {

    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow() {

    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide() {

    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload() {

    },

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh() {

    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom() {

    },

    /**
     * 用户点击右上角分享
     */
    onShareAppMessage() {

    }
})