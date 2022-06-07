var commonAction = {};

var common = require("./common.js");

findRootTaoliveUi = function () {
    var root = packageName(common.taolivePackageName).className("FrameLayout").findOne(1000);
    if (root == null) {
        toastLog("Taolive FrameLayout is not exist");
        return null;
    }
    return root;
}

// 判断是否主界面
judgeTaoliveMainPage = function () {
    var root = findRootTaoliveUi();
    if (root == null) {
        return false;
    }

    var tabList = packageName(common.taolivePackageName).id("hp3_tab_img").find();
    var liveHome = packageName(common.taolivePackageName).id("taolive_home_operation_btn").findOne(1000);
    log("Tab: " + tabList.length + ", Home: " + (liveHome != null));
    if (tabList.length == 4 && liveHome != null) {
        toastLog("Taolive main page");
        return true;
    }

    return false;
}

// 多次判断是否进入主页，避免网络延时导致问题
commonAction.loopJudgeTaoliveMainPage = function (sleepTime) {
    var trytimes = 0;
    while (trytimes < 10) {
        var isLoged = judgeTaoliveMainPage();
        if (isLoged) {
            return true;
        }
        trytimes = trytimes + 1;
        sleep(sleepTime);
    }
    return false;
}

commonAction.backTaoliveMainPage = function () {
    log("backTaoliveMainPage");
    try{
        var curPkg = currentPackage();
        log("currentPackage(): " + curPkg);
        if (curPkg != common.taolivePackageName) {
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
            result = judgeTaoliveMainPage()
            if (result){
                return true;
            }
            //非直播视频播放过程中back会弹出 未完成看视频x分钟任务 弹窗提示，再back会返回播放页面，故需特殊处理
            var leaveTips = text("残忍离开").findOne(1000);
            if (leaveTips != null) {
                log("点击 残忍离开: " + leaveTips.click());
                sleep(1000);
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
commonAction.gotoCoinCenter = function () {
    log("gotoCoinCenter");
    var ret = false;
    var tabList = packageName(common.taolivePackageName).id("hp3_tab_img").find();
    if (tabList.length != 4) {
        commonAction.backTaoliveMainPage();
        return ret;
    }

    var mineTab = tabList[3];
    var clickRet = click(mineTab.bounds().centerX(), mineTab.bounds().centerY());
    log("点击 我的: " + clickRet);
    if (clickRet == false) {
        commonAction.backTaoliveMainPage();
        return ret;
    }
    sleep(1000);

    var coinCenter = common.waitForText("text", "元宝中心", true, 10);
    if (coinCenter == null) {
        commonAction.backTaoliveMainPage();
        return ret;
    }

    clickRet = click(coinCenter.bounds().centerX(), coinCenter.bounds().centerY() - coinCenter.bounds().height());
    log("点击 元宝中心: " + clickRet);
    if (clickRet == false) {
        commonAction.backTaoliveMainPage();
        return ret;
    }

    sleep(1000);
    coinCenter = common.waitForText("text", "我的元宝，今日已赚", true, 10);
    if (coinCenter == null) {
        commonAction.backTaoliveMainPage();
        return ret;
    }

    var objs = [];
    common.queryList(coinCenter.parent(), 0, objs);
    log("我的元宝: " + objs[0].text() + ", 今日已赚: " + objs[3].text());

    //如果弹提示框了，点关闭
    var getBtn = textMatches(/去领步数/).findOne(1000);
    if (getBtn != null) {
        var objs = [];
        common.queryList(getBtn.parent().parent(), 0, objs);
        log(getBtn.text() + " 关闭: " + click(objs[1].bounds().centerX(), objs[1].bounds().centerY()));
    }

    ret = true;
    return ret;
}

commonAction.scrollThrough = function (txt, timeout) {
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

//成功返回true，超时或异常返回false，最后会返回上一个页面
commonAction.doBrowseTasks = function (tasklist) {
    var ret = false;
    for (var i = 0; i < tasklist.length; i++) {
        toastLog("点击 " + tasklist[i].Title + " " + tasklist[i].BtnName + ": " + click(tasklist[i].Button.bounds().centerX(), tasklist[i].Button.bounds().centerY()));
        // 等待离开任务列表页面
        if (common.waitForText("textContains", "浏览", true, 10)) {
            log("等待 " + tasklist[i].Title + " 浏览完成，60s超时");
            var browseRet = commonAction.scrollThrough("浏览", 60);
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

//成功返回true，超时或异常返回false，最后会返回上一个页面
commonAction.doSearchTasks = function (tasklist) {
    var ret = false;
    for (var i = 0; i < tasklist.length; i++) {
        toastLog("点击 " + tasklist[i].Title + " " + tasklist[i].BtnName + ": " + click(tasklist[i].Button.bounds().centerX(), tasklist[i].Button.bounds().centerY()));
        // 等待离开任务列表页面
        var searchBtn = common.waitForText("text", "搜索", true, 10)
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

//成功返回true，超时或异常返回false，最后会返回上一个页面
commonAction.doWatchTasks = function (tasklist) {
    var ret = false;
    var swipeChoice = [
        [device.height * 7 / 8, device.height / 8],
        [device.height * 5 / 6, device.height / 8],
        [device.height * 3 / 4, device.height / 8]
    ];
    for (var i = 0; i < tasklist.length; i++) {
        toastLog("点击 " + tasklist[i].Title + " " + tasklist[i].BtnName + ": " + click(tasklist[i].Button.bounds().centerX(), tasklist[i].Button.bounds().centerY()));
        // 等待离开任务列表页面
        if (common.waitForText("text", "后完成", true, 10)) {
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

                //红包雨弹窗提示
                var rule = text("活动规则").findOne(1000);
                if (rule != null) {
                    var objs = [];
                    common.queryList(rule.parent().parent().parent(), 0, objs);
                    log("红包雨弹窗 关闭: " + objs[0].click());
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
                        var swipeXY = swipeChoice[Math.floor(Math.random() * swipeChoice.length)];
                        log("swipe " + swipe(device.width / 2, swipeXY[0], device.width / 2, swipeXY[1], 1000));
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

module.exports = commonAction;