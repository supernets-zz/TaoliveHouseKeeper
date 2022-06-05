"ui";
const appName = "TaoliveHouseKeeper";
const destAppName = "点淘"
const dtPackageName="com.taobao.live"
const execInterval = 15 * 60; //检查间隔时间，单位：秒，周期任务每15分钟整点做一次

var shutdownFlag = threads.atomic();
var storagelock = threads.lock();
var localStorages=storages.create(appName+":global");
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
  
function timestampToTime(timestamp) {
    var date = new Date(timestamp);//时间戳为10位需*1000，时间戳为13位的话不需乘1000
    var Y = date.getFullYear() + '-';
    var M = (date.getMonth()+1 < 10 ? '0'+(date.getMonth()+1) : date.getMonth()+1) + '-';
    var D = (date.getDate() < 10 ? '0' + date.getDate() : date.getDate()) + ' ';
    var h = (date.getHours() < 10 ? '0' + date.getHours() : date.getHours()) + ':';
    var m = (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()) + ':';
    var s = date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds();
    return Y+M+D+h+m+s;
}

function safeGet(key) {
    var flag = false;
    try{
        flag = storagelock.tryLock();
        var data = null;
        if (flag) {
            var exist = localStorages.contains(key);
            if (exist) {
                data = localStorages.get(key);
            }
        }
        return data;
    } finally {
        if (flag) {
            storagelock.unlock();
        }
    }
}
function safeSet(key,stringValue) {
    var flag = false;
    try {
        flag = storagelock.tryLock();
        if (flag) {
            localStorages.put(key,stringValue);
        }
    } finally {
        if (flag) {
            storagelock.unlock();
        }
    }
}

// 从存储中获取phone
console.setGlobalLogConfig({
    "file": "/sdcard/Download/taolivehousekeeper-log.txt"
});
setScreenMetrics(720, 1440);

ui.statusBarColor("#FF4FB3FF")
function main_page(){
    toastLog("start main page");
    ui.layout(
        <drawer id="drawer">
            <vertical>
                <appbar>
                    <toolbar id="toolbar" bg="#ff4fb3ff" title="{{appName}}"/>
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
        log("isAllDailyTaskComplete: " + allComplete + ", mainWorker: " + ret);
        if (allComplete && ret) {
            var now = new Date().getTime();
            var nextCheckTime = parseInt((now + execInterval * 1000) / (execInterval * 1000)) * (execInterval * 1000);
            log(timestampToTime(nextCheckTime) + " 进行下一次检查");
            sleep((nextCheckTime - now)*1000);
        }
    }
});

function queryList(json,arr) {
    for (var i = 0; i < json.childCount(); i++) {
        var sonList = json.child(i);
        if (sonList.childCount() == 0) {
            arr.push(json.child(i));
        } else {
            queryList(sonList, arr);
        }
    }
    return arr;
}

function listAll(){
    sleep(3000);
    //var list = className("ListView").findOne();
    var list = className("FrameLayout").findOne();
    var arr=[]
    queryList(list,arr);
    for(var k=0;k<arr.length;k++){
        log("第"+k+"个子控件"+arr[k]);
    }
}

function WaitForText(method, txt, visible, sec) {
    var obj = null;
    for (var i = 0; i < sec && obj == null; i++) {
        if (visible) {
            obj = eval(method + "(\"" + txt + "\").visibleToUser(true).findOne(1000)");
        } else {
            obj = eval(method + "(\"" + txt + "\").findOne(1000)");
        }
        if (obj == null) {
            log("等待 " + txt + " 出现");
        }
    }
    return obj;
}

function WaitForTextMatches(regex, visible, sec) {
    var obj = null;
    for (var i = 0; i < sec && obj == null; i++) {
        if (visible) {
            obj = eval("textMatches(" + regex + ").visibleToUser(true).findOne(1000)");
        } else {
            obj = eval("textMatches(" + regex + ").visibleToUser(true).findOne(1000)");
        }
        if (obj == null) {
            log("等待 " + regex + " 出现");
        }
    }
    return obj;
}

//返回是否超时
function WaitDismiss(method, txt, sec) {
    // 等待离开"进入并关注"任务列表页面
    var obj = null;
    for (var i = 0; i < sec; i++) {
        obj = eval(method + "(\"" + txt + "\").findOne(1000)");
        if (obj == null) {
            log("等待 " + txt + " 消失");
            return false;
        }
    }
    return true;
}

function filterTaskList(todoTasks, validTaskNames) {
    var ret = [];
    for (var i = 0; i < todoTasks.length; i++) {
        if (validTaskNames.indexOf(todoTasks[i].Title) != -1) {
            ret.push(todoTasks[i]);
        }
    }
    return ret;
}

function findRootTaoliveUi() {
    var root = packageName(dtPackageName).className("FrameLayout").findOne(1000);
    if (root == null) {
        toastLog("Taolive FrameLayout is not exist");
        return null;
    }
    return root;
}

// 判断是否主界面
function JudgeTaoliveMainPage(){
    var root = findRootTaoliveUi();
    if (root == null) {
        return false;
    }

    var tabList = packageName(dtPackageName).id("hp3_tab_img").find();
    var liveHome = packageName(dtPackageName).id("taolive_home_operation_btn").findOne(1000);
    log("Tab: " + tabList.length + ", Home: " + (liveHome != null));
    if (tabList.length == 4 && liveHome != null) {
        toastLog("Taolive main page");
        return true;
    }

    return false;
}

// 多次判断是否进入主页，避免网络延时导致问题
function loopJudgeTaoliveMainPage(sleepTime) {
    var trytimes = 0;
    while (trytimes < 10) {
        var isLoged = JudgeTaoliveMainPage();
        if (isLoged) {
            return true;
        }
        trytimes = trytimes + 1;
        sleep(sleepTime);
    }
    return false;
}

function backTaoliveMainPage(){
    log("backTaoliveMainPage");
    try{
        var curPkg = currentPackage();
        log("currentPackage(): " + curPkg);
        if (curPkg != dtPackageName) {
            log("recents: " + recents());
            sleep(1000);
            var btn = text("点淘").findOne(3000);
            if (btn != null) {
                log("switch to Taolive: " + click(btn.bounds().centerX(), btn.bounds().centerY()));
                sleep(1000);
            } else {
                log("no 点淘 process");
            }
        }

        var trytimes = 0;
        while (trytimes < 10)
        {
            result = JudgeTaoliveMainPage()
            if (result){
                return true;
            }
            var result = back();
            if (!result) {
                toastLog("Taolive back fail");
                return false;
            }
            trytimes = trytimes + 1;
            sleep(3000);
        }
        return false;
    } catch(e) {
        console.error("mainWorker",e);
    }
}

//进入元宝中心
function gotoCoinCenter() {
    log("gotoCoinCenter");
    var ret = false;
    var tabList = packageName(dtPackageName).id("hp3_tab_img").find();
    if (tabList.length != 4) {
        backTaoliveMainPage();
        return ret;
    }

    var mineTab = tabList[3];
    var clickRet = click(mineTab.bounds().centerX(), mineTab.bounds().centerY());
    log("点击 我的: " + clickRet);
    if (clickRet == false) {
        backTaoliveMainPage();
        return ret;
    }
    sleep(1000);

    var coinCenter = WaitForText("text", "元宝中心", true, 10);
    if (coinCenter == null) {
        backTaoliveMainPage();
        return ret;
    }

    clickRet = click(coinCenter.bounds().centerX(), coinCenter.bounds().centerY() - coinCenter.bounds().height());
    log("点击 元宝中心: " + clickRet);
    if (clickRet == false) {
        backTaoliveMainPage();
        return ret;
    }

    sleep(1000);
    coinCenter = WaitForText("text", "规则", true, 10);
    if (coinCenter == null) {
        backTaoliveMainPage();
        return ret;
    }

    ret = true;
    return ret;
}

function doBrowse(txt, timeout) {
    //超时返回false
    var startTime = parseInt(new Date().getTime() / 1000);
    var nowTime = parseInt(new Date().getTime() / 1000);
    for (;;) {
        var slide = textContains(txt).visibleToUser(true).findOne(1000);
        nowTime = parseInt(new Date().getTime() / 1000);
        log("slide tips: " + (slide != null) + ", " + (nowTime - startTime) + "s");
        if (slide == null || nowTime - startTime > timeout || slide != null && slide.bounds().height() < 10) {
            break;
        }
        swipe(device.width / 5, device.height * 13 / 16, device.width / 5, device.height * 11 / 16, 200);
        sleep(1000);
    }

    if (nowTime - startTime >= timeout) {
        return false;
    }

    return true;
}

function doBrowseTasks(tasklist) {
    var ret = false;
    for (var i = 0; i < tasklist.length; i++) {
        toastLog("点击 " + tasklist[i].Title + " " + tasklist[i].BtnName + ": " + click(tasklist[i].Button.bounds().centerX(), tasklist[i].Button.bounds().centerY()));
        // 等待离开任务列表页面
        if (WaitForText("textContains", "浏览", true, 10)) {
            log("等待 " + tasklist[i].Title + " 浏览完成，60s超时");
            var browseRet = doBrowse("浏览", 60);
            //回到任务列表
            back();
            if (browseRet) {
                log("浏览 " + tasklist[i].Title + " 完成");
                ret = true;
            } else {
                log("60s timeout");
            }
            break;
        } else {
            break;
        }
    }
    return ret;
}

function doSearchTasks(tasklist) {
    var ret = false;
    for (var i = 0; i < tasklist.length; i++) {
        toastLog("点击 " + tasklist[i].Title + " " + tasklist[i].BtnName + ": " + click(tasklist[i].Button.bounds().centerX(), tasklist[i].Button.bounds().centerY()));
        // 等待离开任务列表页面
        var searchBtn = WaitForText("text", "搜索", true, 10)
        if (searchBtn != null) {
            sleep(1000);
            var inputRet = setText("李佳琦");
            if (inputRet) {
                log("点击 搜索: " + click(searchBtn.bounds().centerX(), searchBtn.bounds().centerY()));
                sleep(3000);
                //回到任务列表
                back();
                sleep(1000);
                back();
                ret = true;
                break;
            }
        } else {
            break;
        }
    }
    return ret;
}

function doWatchTasks(tasklist) {
    var ret = false;
    for (var i = 0; i < tasklist.length; i++) {
        toastLog("点击 " + tasklist[i].Title + " " + tasklist[i].BtnName + ": " + click(tasklist[i].Button.bounds().centerX(), tasklist[i].Button.bounds().centerY()));
        // 等待离开任务列表页面
        if (WaitForText("text", "后完成", true, 10)) {
            var interval = 10000;
            var startTime = parseInt(new Date().getTime() / 1000);
            var nowTime = parseInt(new Date().getTime() / 1000);
            var closeBtn = id("taolive_close_btn").findOne(1000);
            for (;;) {
                var countdown = text("后完成").findOne(1000);
                var prog = text("6/6").findOne(1000);
                log("pass" + (nowTime - startTime) + "s, countdown: " + (countdown != null) + ", 6/6 exists: " + (prog != null) + ", live: " + (closeBtn != null));
                if (countdown == null) {
                    break;
                }
                nowTime = parseInt(new Date().getTime() / 1000);
                //十五分钟超时，最长的任务是8分钟
                if (nowTime - startTime > 15 * 60) {
                    break;
                }
                if (prog != null && closeBtn != null) {
                    sleep(20000);   //等进度条走完，直播才需要点击领取
                    log("click golden egg " + id("gold_countdown_container").findOne().click());
                    sleep(2000);
                } else {
                    if (closeBtn == null) {
                        log("swipe " + swipe(device.width / 2, device.height * 7 / 8, device.width / 2, device.height / 8, 1000));
                    }
                    sleep(interval);
                }
            }

            if (closeBtn != null) {
                log("click close " + id("taolive_close_btn").findOne().click());
            } else {
                back();
            }
            if (nowTime - startTime < 15 * 60) {
                ret = true;
            }
            break;
        } else {
            break;
        }
    }
    return ret;
}

function gotoWalkEarnCoins() {
    var walkBtn = null;
    if (!gotoCoinCenter()) {
        return walkBtn;
    }

    walkBtn = WaitForText("text", "走路赚元宝", true, 10);
    if (walkBtn == null) {
        return walkBtn;
    }

    var clickRet = click(walkBtn.bounds().centerX(), walkBtn.bounds().centerY() - walkBtn.bounds().height() * 3);
    log("点击 走路赚元宝: " + clickRet);
    if (clickRet == false) {
        return walkBtn;
    }

    walkBtn = WaitForText("text", "出发", true, 10);
    if (walkBtn == null) {
        return walkBtn;
    }
    return walkBtn;
}

function doWalkMainBrowse() {
    log("doWalkMainBrowse");
    // 我的-> 元宝中心-> 走路赚元宝，先上划个半屏，看有没有浏览商品30秒 +300步，有就做，没有拉倒
    var nowDate = new Date().Format("yyyy-MM-dd");
    var done = safeGet(nowDate + ":走路赚元宝浏览首页");
    if (done != null) {
        log("走路赚元宝浏览首页 已做: " + done);
        return;
    }

    toast("doWalkMainBrowse");
    if (gotoWalkEarnCoins() == null) {
        backTaoliveMainPage();
        return;
    }

    log("往上划动半个屏幕: " + swipe(device.width / 2, device.height * 3 / 4, device.width / 2, device.height / 4, 300));
    var walkTips = textContains("浏览商品").findOne(1000);
    if (walkTips != null) {
        log("等待 商品 浏览完成，360s超时");
        var ret = doBrowse("浏览商品", 360);
        if (ret) {
            safeSet(nowDate + ":走路赚元宝浏览首页", "done");
            toastLog("完成 走路赚元宝浏览首页");
        } else {
            toastLog("360s timeout");
        }
    } else {
        safeSet(nowDate + ":走路赚元宝浏览首页", "done");
        toastLog("无 走路赚元宝浏览首页");
    }

    backTaoliveMainPage();
}

function doWalkStreetBrowse() {
    log("doWalkStreetBrowse");
    // 我的-> 元宝中心-> 走路赚元宝，如果混到赚步数列表，点击时会点到任务列表的表头从而关闭了任务列表，故作特殊处理
    var nowDate = new Date().Format("yyyy-MM-dd");
    var done = safeGet(nowDate + ":走路赚元宝浏览街区");
    if (done != null) {
        log("走路赚元宝浏览街区 已做: " + done);
        return;
    }

    toast("doWalkStreetBrowse");
    if (gotoWalkEarnCoins() == null) {
        backTaoliveMainPage();
        return;
    }

    var browseTaskList = [];
    var streetTips = textContains("浏览街区").findOne(1000);
    if (streetTips != null && streetTips.bounds().height() > 10) {
        var obj = {};
        obj.Title = streetTips.text();
        obj.BtnName = "去完成";
        obj.Button = streetTips;
        browseTaskList.push(obj);
        if (doBrowseTasks(browseTaskList)) {
            safeSet(nowDate + ":走路赚元宝浏览街区", "done");
            toastLog("完成 走路赚元宝浏览街区");
        }
    } else {
        safeSet(nowDate + ":走路赚元宝浏览街区", "done");
        toastLog("无 走路赚元宝浏览街区");
    }

    backTaoliveMainPage();
}

function collectSteps(walkBtn) {
    // 不管三七二十一，点一下能量饮料
    log("点击 能量饮料: " + click(walkBtn.bounds().width(), walkBtn.bounds().centerY()));
    // 等待提示消失
    sleep(5000);

    var objs = [];
    queryList(walkBtn.parent(), objs);
    if (objs.length == 3) {
        log(objs[0].text() + ": " + objs[1].text());
        if (parseInt(objs[1].text()) > 0) {
            log("点击 出发: " + click(walkBtn.bounds().centerX(), walkBtn.bounds().centerY()));
        }
    }    

    //领飘在上面的元宝
    var tocollectCoins = textMatches(/\d+元宝\d+步/).find();
    log(tocollectCoins.length);
    
    for (var i = 0; i < tocollectCoins.length; i++) {
        log("点击 " + tocollectCoins[i].text() + ": " + click(tocollectCoins[i].bounds().centerX(), tocollectCoins[i].bounds().centerY()));
        var tips = textContains("成功领取元宝").findOne(1000);
        if (tips != null) {
            log("close: " + click(tips.bounds().right, tips.bounds().top - tips.bounds().height()));
            sleep(1000);
        }
    }
}

//走路赚元宝周期任务
function doWalkRoutineTasks() {
    toastLog("doWalkRoutineTasks");
    // 我的-> 元宝中心-> 走路赚元宝
    // 出发按钮
    var walkBtn = gotoWalkEarnCoins();
    if (walkBtn == null) {
        backTaoliveMainPage();
        return;
    }

    var earnStepsBtnX = walkBtn.bounds().centerX() + walkBtn.bounds().width() * 2;
    var earnStepsBtnY = walkBtn.bounds().centerY();
    for (;;) {
        clickRet = click(earnStepsBtnX, earnStepsBtnY);
        log("点击 赚步数(" + earnStepsBtnX + ", " + earnStepsBtnY + "): " + clickRet);
        if (clickRet == false) {
            backTaoliveMainPage();
            return;
        }

        walkBtn = WaitForText("text", "得步数", true, 10);
        if (walkBtn == null) {
            backTaoliveMainPage();
            return;
        }

        var browseTaskList = [];    //浏览任务列表，滑动浏览完成后返回
        var searchTaskList = [];    //搜索任务列表，搜索后返回
        var watchTaskList = [];     //观看任务列表，需要多次折返
        var validTaskNames = [];
        var totalTasks = packageName(dtPackageName).text("得步数").find();
        var validTasks = packageName(dtPackageName).text("得步数").visibleToUser(true).find();

        for (var i = 0; i < validTasks.length; i++) {
            var objs = [];
            queryList(validTasks[i].parent(), objs);
            if (objs.length == 7 && objs[5].bounds().height() > 50 || objs.length == 6 && objs[4].bounds().height() > 50) {
                validTaskNames.push(objs[0].text());
            }
        }
        toastLog("任务数: " + totalTasks.length + ", 可见: " + validTaskNames.length + ", " + validTaskNames);

        if (totalTasks.length == 0) {
            captureScreen("/sdcard/Download/" + (new Date().Format("yyyy-MM-dd HH:mm:ss")) + ".png");
            break;
        }

        totalTasks.forEach(function(tv) {
            var objs = [];
            var title = "";
            var btn = null;
            queryList(tv.parent(), objs);
            title = objs[0].text();
            if (objs.length == 7) {
                btn = objs[5];
            } else if (objs.length == 6) {
                btn = objs[4];
            } else {
                for (var k = 0;k < objs.length; k++) {
                    log("第" + k + "个子控件" + objs[k]);
                }
            }
            if (btn != null) {
                if (/去完成|去浏览/.test(btn.text()) && title.indexOf("邀请") == -1 && title.indexOf("支付宝") == -1) {
                    var obj = {};
                    obj.Title = title;
                    obj.BtnName = btn.text();
                    obj.Button = btn;
                    if (obj.Title.indexOf("浏览") != -1) {
                        browseTaskList.push(obj);
                    } else if (obj.Title.indexOf("搜索") != -1) {
                        searchTaskList.push(obj);
                    } else {
                        watchTaskList.push(obj);
                    }
                    log("未完成任务" + (browseTaskList.length + searchTaskList.length + watchTaskList.length) + ": " + obj.Title + ", " + obj.BtnName + ", (" + obj.Button.bounds().centerX() + ", " + obj.Button.bounds().centerY() + ")");
                } else {
                    log("跳过任务: " + title + ", " + btn.text() + ", (" + btn.bounds().centerX() + ", " + btn.bounds().centerY() + ")");
                }
            }
        });

        if (browseTaskList.length + searchTaskList.length + watchTaskList.length == 0) {
            break;
        }

        browseTaskList = filterTaskList(browseTaskList, validTaskNames)
        if (doBrowseTasks(browseTaskList)) {
            walkBtn = WaitForText("text", "出发", true, 10);
            if (walkBtn == null) {
                break;
            }
            //等待成功提示消失
            sleep(3000);
            collectSteps(walkBtn);
            continue;
        }

        searchTaskList = filterTaskList(searchTaskList, validTaskNames)
        if (doSearchTasks(searchTaskList)) {
            walkBtn = WaitForText("text", "出发", true, 10);
            if (walkBtn == null) {
                break;
            }
            //等待成功提示消失
            sleep(3000);
            collectSteps(walkBtn);
            continue;
        }

        watchTaskList = filterTaskList(watchTaskList, validTaskNames)
        if (doWatchTasks(watchTaskList)) {
            walkBtn = WaitForText("text", "出发", true, 10);
            if (walkBtn == null) {
                break;
            }
            //等待成功提示消失
            sleep(3000);
            collectSteps(walkBtn);
            continue;
        }
    }

    backTaoliveMainPage();
}

//打工赚元宝周期任务
function doWorkRoutineTasks() {
    log("doWorkRoutineTasks");

}

//摇一摇赚元宝周期任务
function doShakeRoutineTasks() {
    log("doShakeRoutineTasks");

}

function isAllDailyTaskComplete() {
    var nowDate = new Date().Format("yyyy-MM-dd");
    var taskList = [":走路赚元宝浏览首页", ":走路赚元宝浏览街区"];
    for (var i = 0; i < taskList.length; i++) {
        var done = safeGet(nowDate + taskList[i]);
        if (done == null) {
            log("isAllDailyTaskComplete: " + nowDate + taskList[i] + " 未完成");
            return false;
        }
    }
    return true;
}

function mainWorker() {
    var ret = false;
    try{
        log("launchApp " + destAppName + ": " + app.launchApp(destAppName));
        log("recents: " + recents());
        sleep(1000);
        var btn = text("点淘").findOne(3000);
        if (btn != null) {
            log("switch to Taolive: " + click(btn.bounds().centerX(), btn.bounds().centerY()));
            sleep(1000);
        } else {
            log("no 点淘 process");
        }
        var isLoged = loopJudgeTaoliveMainPage(6000);
        if (!isLoged) {
            toastLog("Taolive is unknown status");
            captureScreen("/sdcard/Download/" + (new Date().Format("yyyy-MM-dd HH:mm:ss")) + ".png");
        } else {
            // 浏览我的-> 元宝中心-> 走路赚元宝 主页，每日一次
            doWalkMainBrowse();
            // 浏览我的-> 元宝中心-> 走路赚元宝 街区提示，每日一次
            doWalkStreetBrowse();
            // 我的-> 元宝中心-> 走路赚元宝，浏览xx、看视频、看直播
            doWalkRoutineTasks();
            // 我的-> 元宝中心-> 打工赚元宝，浏览xx、看视频、看直播
            doWorkRoutineTasks();
            // 我的-> 元宝中心-> 摇一摇赚元宝，浏览xx、看视频、看直播
            doShakeRoutineTasks();
            ret = true;
        }
	} catch(e) {
		console.error("mainWorker",e);
    } finally {
		backTaoliveMainPage();
		home();
		toastLog("Back home success");
		sleep(3000);
		toastLog("finish mainWorker loop");
    }
    return ret;
}

