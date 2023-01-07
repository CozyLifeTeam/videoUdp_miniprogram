
/**
 * 计算某年某月有多少天
 * @param  {[number]} year 某年
 * @param  {[number]} month 某月
 * @return {[number]}      某年某月有多少天
 */
function getDaysInYearMonth(year, month) {
    month = parseInt(month, 10);
    var date = new Date(year, month, 0);
    return date.getDate();
}
Component({
    /**
     * 组件的属性列表
     */
    properties: {
        period: {
            type: Number,
            value: 7
        }
    },

    /**
     * 组件的初始数据
     */
    data: {
        time: {
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1,
            date: new Date().getDate()
        },
        titleTime: "",
        listTime: [],
    },
    lifetimes: {
        ready() {
            this.initTime();
        }
    },
    /**
     * 组件的方法列表
     */
    methods: {
        initTime() {
            const { year, month, date } = this.data.time;

            this.setData({
                titleTime: `${month}月${date}日`,
                listTime: this.compute_listTime()
            })
        },
        compute_listTime() {
            const { year, month, date } = this.data.time;
            let arr: Object[] = [];
            for (let i = 0; i < this.data.period; i++) {
                if (i == 0) {
                    arr.unshift({
                        value: date - i,
                        state: true
                    });
                    continue;
                }
                if (i >= date && month - 1 == 0) {
                    const j = i - date;
                    const datenum = getDaysInYearMonth(year - 1, 12);
                    arr.unshift({
                        value: datenum - j,
                        state: false
                    });
                    continue;
                }
                if (i >= date && month - 1 != 0) {
                    const j = i - date;
                    const datenum = getDaysInYearMonth(year, month - 1);
                    
                    arr.unshift({
                        value: datenum - j,
                        state: false
                    });
                    continue;
                }
                arr.unshift({
                    value: date - i,
                    state: false
                });
            }
            return arr
        },
        tapDate({ currentTarget: { dataset: { tapdate, index } } }) {
            let { year, month, date } = this.data.time;
            let listTime = this.data.listTime;

            if (tapdate > date) {
                month -= 1;
            }

            listTime.forEach(item => {
                item.state = false;
            })
            listTime[index].state = true;
            
            const start_timestamp = Math.floor(new Date(`${year}-${month}-${tapdate} 00:00:00`).getTime() / 1000)
            const end_timestamp = Math.floor(new Date(`${year}-${month}-${tapdate} 23:59:59`).getTime() / 1000)
            this.setData({
                listTime,
                titleTime: `${new Date(start_timestamp*1000).getMonth() + 1}月${new Date(start_timestamp*1000).getDate()}日`
            })
            this.triggerEvent('onMessageTap', {
                start_timestamp, end_timestamp
            })
            
        }
    }
})
