var eliminateToEarn = {};

var common = require("./common.js");
var commonAction = require("./commonAction.js");

const eliminateGameTag = "消消赚元宝";
const addGameTimes = "./eliminateGame_addGameTimes.jpg";
const getAward = "./eliminateGame_getAward.jpg";
const todo = "./eliminateGame_todo.jpg";

eliminateToEarn.dailyJobs = [];
eliminateToEarn.dailyJobs.push(eliminateGameTag);

eliminateToEarn.doEliminate = function () {
    log("doEliminate");
    var nowDate = new Date().Format("yyyy-MM-dd");
    var done = common.safeGet(nowDate + ":" + eliminateGameTag);
    if (done != null) {
        log(eliminateGameTag + " 已做: " + done);
        return;
    }

    toast("doEliminate");
    // 我的-> 元宝中心-> 去签到，上划屏幕找到去签到或待开奖按钮
    if (!commonAction.gotoCoinCenter()) {
        commonAction.backToAppMainPage();
        return;
    }

    var btnGame = null;
    for (var i = 0; i < 10; i++) {
        btnGame = text("去游戏").visibleToUser(true).findOne(1000);
        if (btnGame == null || btnGame != null && btnGame.bounds().height() < 42) {
            log("上划屏幕找 去游戏: " + swipe(device.width / 2, device.height * 7 / 8, device.width / 2, device.height / 8, 1000));
            sleep(1000);
            continue;
        }
        break;
    }

    if (btnGame == null) {
        log("去游戏 not found")
        commonAction.backToAppMainPage();
        return;
    }

    log("点击 去游戏: " + click(btnGame.bounds().centerX(), btnGame.bounds().centerY()));

    var addGameTimesPt = common.waitForImage(addGameTimes, 30);
    if (addGameTimesPt == null) {
        log("游戏加载失败");
        commonAction.backToAppMainPage();
        return;
    }

    log("点击 加体力: " + click(addGameTimesPt.x, addGameTimesPt.y));
    sleep(3000);

    var startTick = new Date().getTime();
    for (;(new Date().getTime() - startTick) / 1000 < 20 * 60;) {
        var getAwardPt = common.findImage(getAward);
        var todoPt = common.findImage(todo);
        if (getAwardPt == null && todoPt == null) {
            common.safeSet(nowDate + ":" + eliminateGameTag, "done");
            toastLog("完成 " + eliminateGameTag);
            break;
        }

        if (getAwardPt != null) {
            log("点击 领奖励: " + click(getAwardPt.x, getAwardPt.y));
            sleep(1000);
        }

        if (todoPt != null) {
            log("点击 去完成: " + click(todoPt.x, todoPt.y));
            sleep(1000);
            var countdown = common.waitForText("text", "后完成", true, 10)
            if (countdown != null) {
                var lastLeftTime = parseInt(countdown.parent().child(1).text().match(/\d+/));
                var interval = 3000;    //interval加上红包雨弹窗提示检测2秒正好5秒一个周期
                var startTime = parseInt(new Date().getTime() / 1000);
                var nowTime = parseInt(new Date().getTime() / 1000);
                var closeBtn = id("taolive_close_btn").findOne(1000);
                var startTick = new Date().getTime();
                for (;;) {
                    var prog = text("6/6").findOne(1000);
                    var countdown = text("后完成").findOne(1000);
                    log("pass" + (nowTime - startTime) + "s, countdown: " + (countdown != null) + ", 6/6 exists: " + (prog != null) + ", live: " + (closeBtn != null));
                    if (countdown == null) {
                        if (new Date().getTime() - startTick > 10 * 1000) {
                            break;
                        }
                        captureScreen("/sdcard/Download/watch" + (new Date().Format("yyyy-MM-dd_HH:mm:ss")) + ".png");
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
                            var leftTime = parseInt(countdown.parent().child(1).text().match(/\d+/));
                            if (leftTime == lastLeftTime) {
                                log("swipe " + swipe(device.width / 2, swipeXY[0], device.width / 2, swipeXY[1], 1000));
                                lastLeftTime = leftTime;
                            } else {
                                lastLeftTime = leftTime;
                            }
                        }
                        sleep(interval);
                    }

                    //红包雨弹窗提示
                    var rule = text("活动规则").findOne(1000);
                    if (rule != null) {
                        var dlgCloseBtn = rule.parent().parent().parent().child(0);
                        log("红包雨弹窗 关闭: " + dlgCloseBtn.click());
                    }

                    var tryAgainBtn = text("再来一次").findOne(1000);
                    if (tryAgainBtn != null) {
                        var dlgCloseBtn = tryAgainBtn.parent().parent().parent().child(1);
                        log("啊哦，这次没抢到红包 关闭: " + click(dlgCloseBtn.bounds().centerX(), dlgCloseBtn.bounds().centerY()));
                    }
                }

                if (closeBtn != null) {
                    log("click close " + id("taolive_close_btn").findOne().click());
                } else {
                    back();
                }
                sleep(5000);
            }
        }
    }

    commonAction.backToAppMainPage();
}

module.exports = eliminateToEarn;