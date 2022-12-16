//dpid点枚举值

const light = {
  //全部dpid
  dpid: {
    switch_led: 1,
    work_mode: 2,
    temp_value: 3,
    bright_value: 4,
    hue_value: 5,
    sat_value: 6,
    scene_data: 7,
    speed_value: 8,
    power_memory: 9,
    sensitivity_value: 10,
    rgb_turn: 11,
    chip_point: 12,
    countdown: 13,
    normal_timer: 14,
    music_index: 15,
    dream_static_color: 16,
    dream_control_data: 17,
    dream_scene_value: 18,
    dream_scene_index: 19,
    dream_static_fade: 20,
    sun_light_index: 22,
    dian_liang: 23,
    dian_liu: 24,
    dian_ya: 25,
  },
  //全部可以枚举的dpid的值
  action: {
      switch_led: {
        on: 1,
        off: 0,
      },
      work_mode: {
        static: 0,
        scene: 1,
        music: 2,
        diy: 3,
        micPhone: 4,
      },
      // temp_value: {
      // },
      // bright_value: {
      // },
      // hue_value: {
      // },
      // sat_value: {
      // },
      // scene_data: {
      // },
      // speed_value: {
      // },
      power_memory: {
        yes: 1,
        on: 0,
      },
      // sensitivity_value: {
      // },
      rgb_turn: {
        GR: 0,
        RG: 1,
        GB: 2,
        RB: 3,
        BR: 4,
        BG: 5,
      },
      // chip_point: {
      // },
      // countdown: {
      // },
      // normal_timer: {
      // },
      // music_index: {
      // },
      // dream_static_color: {
      // },
      // dream_control_data: {
      // },
      // dream_diy_scene: {
      // },
      // dream_scene_index: {
      // },
      dream_static_fade: {
        on: 1,
        off: 0,
      },

    //控制的前置操作，例如想要设置模式=>dpid=2，必须下发dpid=1的数据    
    __controlPrefix: {
      2: {
        1: 1
      },
      4: {
        1: 1,
      },
      5: {
        2: 0,
        1: 1,
      },
      6: {
        2: 0,
        1: 1,
      },
      7: {
        2: 1,
        1: 1,
      },
      15: {
        1: 1,
      },
      16: {
        2: 0,
        1: 1,
      },
      17: {
        2: 0,
        1: 1,
      },
      18: {
        2: 1,
        1: 1,
      },
      19: {
        2: 1,
        1: 1,
      },
    },
    // sensitivity_value: {
    // },
    rgb_turn: {
      GR: 0,
      RG: 1,
      GB: 2,
      RB: 3,
      BR: 4,
      BG: 5,
    },
    // chip_point: {
    // },
    // countdown: {
    // },
    // normal_timer: {
    // },
    // music_index: {
    // },
    // dream_static_color: {
    // },
    // dream_control_data: {
    // },
    // dream_diy_scene: {
    // },
    // dream_scene_index: {
    // },
    dream_static_fade: {
      on: 1,
      off: 0,
    },

  },
  //控制的前置操作，例如想要设置模式=>dpid=2，必须下发dpid=1的数据    
  __controlPrefix: {
    2: {
      1: 1
    },
    4: {
      1: 1,
    },
    5: {
      2: 0,
      1: 1,
    },
    6: {
      2: 0,
      1: 1,
    },
    7: {
      2: 1,
      1: 1,
    },
    15: {
      1: 1,
    },
    16: {
      2: 0,
      1: 1,
    },
    17: {
      2: 0,
      1: 1,
    },
    18: {
      2: 1,
      1: 1,
    },
    19: {
      2: 1,
      1: 1
    },
    22: {
      1: 1
    }
  },
  actual: {},

};
const switchs = {
	//全部dpid
	dpid: {
		switch: 1, //开关
		countdown_1: 2, //开关1倒计时
		normal_time_1: 3, //开关1周期定时
		countdown_2: 4, //开关2倒计时
		normal_time_2: 5, //开关2周期定时
		countdown_3: 6, //开关3倒计时
		normal_time_3: 7, //开关3周期定时	
		countdown_4: 8, //开关4倒计时
		normal_time_4: 9, //开关4周期定时
		countdown_5: 10, //开关5倒计时
		normal_time_5: 11, //开关5周期定时
		countdown_6: 12, //开关6倒计时
		normal_time_6: 13, //开关6周期定时
		countdown_7: 14, //开关7倒计时
		normal_time_7: 15, //开关7周期定时
		countdown_8: 16, //开关8倒计时
		normal_time_8: 17, //开关8周期定时
		relay_status: 18, //上电状态设置	
		led_status: 19, //指示灯状态设置
		backlight_status: 20, //背光开关
		child_lock: 21, //童锁
		cycle_time: 23, //循环定时
		random_time: 24, //随机定时
		switch_inching: 25, //点动开关
		add_ele: 26, //增加电量
		cur_current: 27, //当前电流
		cur_power: 28, //当前功率
		cur_voltage: 29, //当前电压
		fault: 30, //故障告警
		awaken: 31, //发送睡眠唤醒
    power_protect: 32, //过电保护
	},

	//枚举的dpid
	action: {
		//上电状态设置
		relay_status: {
			off: 0,
			on: 1,
			memory: 2
		},
		//指示灯状态设置	
		led_status: {
			none: 0,
			relay: 1,
			pos: 2
		},
		//故障告警
		fault: {
			ov_cr: 'ov_cr',
			ov_vol: 'ov_vol',
			ov_pwr: 'ov_pwr',
			ls_cr: 'ls_cr',
			ls_vol: 'ls_vol',
			ls_pow: 'ls_pow'
		}
	},
	__controlPrefix: {},
	actual: {},
};

module.exports = {
  light,
  switchs
}