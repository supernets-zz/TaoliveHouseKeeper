"ui";
const execInterval = 15 * 60; //检查间隔时间，单位：秒，周期任务每15分钟整点做一次

var common = require("./common.js");
var commonAction = require("./commonAction.js");

var walkToEarn = require("./walkToEarn.js");
var workToEarn = require("./workToEarn.js");
var shakeToEarn = require("./shakeToEarn.js");
var sleepToEarn = require("./sleepToEarn.js");
var signInEarn = require("./signInEarn.js");

var shutdownFlag = threads.atomic();
var background = threads.disposable();

Date.prototype.Format = function (fmt) {
    var o = {
        'M+': this.getMonth() + 1,
        'd+': this.getDate(),
        'H+': this.getHours(),
        'm+': this.getMinutes(),
        's+': this.getSeconds(),
        'S+': this.getMilliseconds()
    };
    //因为date.getFullYear()出来的结果是number类型的,所以为了让结果变成字符串型，下面有两种方法：
    if (/(y+)/.test(fmt)) {
        //第一种：利用字符串连接符“+”给date.getFullYear()+''，加一个空字符串便可以将number类型转换成字符串。
        fmt = fmt.replace(RegExp.$1, (this.getFullYear() + '').substr(4 - RegExp.$1.length));
    }
    for (var k in o) {
        if (new RegExp('(' + k + ')').test(fmt)) {
            //第二种：使用String()类型进行强制数据类型转换String(date.getFullYear())，这种更容易理解。
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (('00' + o[k]).substr(String(o[k]).length)));
        }
    }
    return fmt;
};

// 从存储中获取phone
console.setGlobalLogConfig({
    "file": "/sdcard/Download/taolivehousekeeper-log.txt"
});
//setScreenMetrics(720, 1440);

ui.statusBarColor("#FF4FB3FF")
function main_page(){
    toastLog("start main page");
    //非直播视频有的下面有遮挡导致上划返回true但实际没效果，多备几套坐标随机选择
    ui.layout(
        <drawer id="drawer">
            <vertical>
                <appbar>
                    <toolbar id="toolbar" bg="#ff4fb3ff" title="{{common.appName}}"/>
                </appbar>
                <vertical gravity="center" layout_weight="1">
                    <vertical padding="10 6 0 6" bg="#ffffff" w="*" h="auto" margin="0 5" elevation="1dp">
                        <Switch id="autoService" w="*" checked="{{auto.service != null}}" textColor="#666666" text="ACCESSIBILITY SETTINGS"/>
                    </vertical>
                </vertical>
                <button id="ctrl" text="START" tag="ScriptTag" color="#ffffff" bg="#FF4FB3FF" foreground="?selectableItemBackground"/>
            </vertical>
    </drawer>
    );
}
// 监听线程
threads.start(function(){
    //在子线程中调用observeKey()从而使按键事件处理在子线程执行
    toastLog("监听按键启动");
    events.observeKey();
    events.on("key_down", function(keyCode, events){
        //音量键关闭脚本
        if(keyCode == keys.volume_up){
            toastLog("通知结束脚本");
            shutdownFlag.getAndIncrement();
        }
    });
});
main_page();

events.on("exit", function(){
    log("STOP");
    device.cancelKeepingAwake();
});

//无障碍开关监控
ui.autoService.setOnCheckedChangeListener(function(widget,checked) {
    if(checked&&!auto.service) {     
        app.startActivity({
            action: "android.settings.ACCESSIBILITY_SETTINGS"
        });
    }
    if(!checked&&auto.service)auto.service.disableSelf()
    ui.autoService.setChecked(auto.service!=null) 
});

//回到本界面时，resume事件会被触发
ui.emitter.on("resume",()=>{
    // 此时根据无障碍服务的开启情况，同步开关的状态
    ui.autoService.checked = auto.service != null;
});

ui.ctrl.click(()=>{
    if(!auto.service){
        toastLog("Please check accessibility");
        return;
    }

    toastLog("Start workMain");
    background.setAndNotify(1);
});

// 后台运行主线程
threads.start(function(){
    // 阻塞,等待连接条件
    var flag = background.blockedGet();
	log("启动点淘管家主线程:");
    requestScreenCapture();
    while (flag > 0) {
        var ret = false;
        try {
            var shutdown = shutdownFlag.get();
            if (shutdown > 0) {
                toastLog("Exit script now...");
                break;
            }
            var isScreenOn = device.isScreenOn();
            log("Start now, isScreenOn: " + isScreenOn);
            if (!isScreenOn) {
                device.wakeUp();
                sleep(2000);
                log("swipe to unlock: " + swipe(device.width / 2, device.height * 7 / 8, device.width / 2, device.height * 3 / 8, 300));
            }
            device.keepScreenOn();
            ret = mainWorker();
            device.cancelKeepingAwake();
        } catch(e) {
            console.error("main err ",e);
            device.cancelKeepingAwake();
        }
        var allComplete = isAllDailyTaskComplete();
        log("isAllDailyTaskComplete: " + allComplete + ", mainWorker return: " + ret);
        if (allComplete && ret) {
            var now = new Date().getTime();
            var nextWalkCheckTS = parseInt(common.safeGet(common.nextWalkCheckTimestampTag));
            var nextWorkCheckTS = parseInt(common.safeGet(common.nextWorkCheckTimestampTag));
            var nextPeriodCheckTS = parseInt((now + execInterval * 1000) / (execInterval * 1000)) * (execInterval * 1000);
            log(common.nextWalkCheckTimestampTag + ": " + common.timestampToTime(nextWalkCheckTS) + ", " +
                common.nextWorkCheckTimestampTag + ": " + common.timestampToTime(nextWorkCheckTS) + ", " +
                "下周期检查时间戳: " + common.timestampToTime(nextPeriodCheckTS));

            var finalNextCheckTS = nextPeriodCheckTS;
            if (!isNaN(nextWalkCheckTS) && now < nextWalkCheckTS) {
                finalNextCheckTS = Math.min(finalNextCheckTS, nextWalkCheckTS);
            }
            if (!isNaN(nextWorkCheckTS) && now < nextWorkCheckTS) {
                finalNextCheckTS = Math.min(finalNextCheckTS, nextWorkCheckTS);
            }

            log(Math.floor((finalNextCheckTS - now) / 1000) + "s 后的 " + common.timestampToTime(finalNextCheckTS) + " 进行下一次检查");
            sleep(finalNextCheckTS - now);
        }
    }
});

function isAllDailyTaskComplete() {
    var nowDate = new Date().Format("yyyy-MM-dd");
    var taskList = [];
    var permitted = common.safeGet(nowDate + ":" + common.walkToEarnPermissionTag);
    if (permitted != null) {
        taskList.push.apply(taskList, walkToEarn.dailyJobs);
    }
    taskList.push.apply(taskList, shakeToEarn.dailyJobs);
    taskList.push.apply(taskList, workToEarn.dailyJobs);
    taskList.push.apply(taskList, sleepToEarn.dailyJobs);
    for (var i = 0; i < taskList.length; i++) {
        var done = common.safeGet(nowDate + ":" + taskList[i]);
        if (done == null) {
            log("isAllDailyTaskComplete: " + nowDate + ":" + taskList[i] + " 未完成");
            return false;
        }
    }
    return true;
}

function mainWorker() {
    var ret = false;
    try{
        log("launchApp " + common.destAppName + ": " + app.launchApp(common.destAppName));
        log("recents: " + recents());
        sleep(1000);
        var btn = text("点淘").findOne(3000);
        if (btn != null) {
            log("switch to Taolive: " + click(btn.bounds().centerX(), btn.bounds().centerY()));
            sleep(1000);
        } else {
            log("no 点淘 process");
        }
        var isLoged = commonAction.loopJudgeTaoliveMainPage(6000);
        if (!isLoged) {
            toastLog("Taolive is unknown status");
            captureScreen("/sdcard/Download/" + (new Date().Format("yyyy-MM-dd HH:mm:ss")) + ".png");
        } else {
            // 我的-> 元宝中心-> 去签到 主页
            // 因为签到只有在收益正常的时候才能成功，故作为走路赚元宝准人判断的依据
            signInEarn.doSignIn();
            signInEarn.doGetSignInBonus();

            // 我的-> 元宝中心-> 去睡觉
            sleepToEarn.doSleep();
            // 我的-> 元宝中心-> 去睡觉
            sleepToEarn.doWakeup();
            // 我的-> 元宝中心-> 去睡觉 主页，时有时无
            sleepToEarn.doSleepMainBrowse();

            // 我的-> 元宝中心-> 摇一摇赚元宝 主页，时有时无
            shakeToEarn.doShakeMainBrowse();

            // 我的-> 元宝中心-> 走路赚元宝 主页，每日一次
            walkToEarn.doWalkMainBrowse();
            // 我的-> 元宝中心-> 走路赚元宝 街区提示，每日一次
            walkToEarn.doWalkStreetBrowse();

            // 我的-> 元宝中心-> 打工赚元宝 首页签到，每日一次，第7天不签
            workToEarn.doWorkDailySign();
            // 我的-> 元宝中心-> 打工赚元宝 主页，每日一次
            workToEarn.doWorkMainBrowse();
            // 我的-> 元宝中心-> 打工赚元宝 旺市，每日一次
            workToEarn.doWorkMarketBrowse();

            // 我的-> 元宝中心-> 摇一摇赚元宝，浏览xx、看视频、看直播
            shakeToEarn.doShakeRoutineTasks();
            // 我的-> 元宝中心-> 走路赚元宝，浏览xx、看视频、看直播
            walkToEarn.doWalkRoutineTasks();
            // 我的-> 元宝中心-> 打工赚元宝，浏览xx、看视频、看直播
            workToEarn.doWorkRoutineTasks();

            ret = true;
        }
	} catch(e) {
		console.error("mainWorker",e);
    } finally {
		commonAction.backTaoliveMainPage();
		home();
		toastLog("Back home success");
		sleep(3000);
		toastLog("finish mainWorker loop");
    }
    return ret;
}

