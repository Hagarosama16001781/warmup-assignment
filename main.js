const fs = require("fs");
function timeToSeconds(time) {
    let parts = time.split(":");
    let h = parseInt(parts[0]);
    let m = parseInt(parts[1]);
    let s = parseInt(parts[2]);

    return h * 3600 + m * 60 + s;
}

function secondsToTime(sec) {

    if(sec < 0) sec = 0;

    let h = Math.floor(sec / 3600);
    let m = Math.floor((sec % 3600) / 60);
    let s = sec % 60;

    return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function convertTo24(timeStr){

    let [time, period] = timeStr.split(" ");
    period = period.toLowerCase();   // 🔧 important fix

    let [h,m,s] = time.split(":").map(Number);

    if(period === "pm" && h !== 12){
        h += 12;
    }

    if(period === "am" && h === 12){
        h = 0;
    }

    return h*3600 + m*60 + s;
}
// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {

    let start = convertTo24(startTime);
    let end = convertTo24(endTime);

    let diff = end - start;

    // FIX: handle overnight shift
    if(diff < 0){
        diff += 24 * 3600;
    }

    return secondsToTime(diff);
}
// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime){

    let start = convertTo24(startTime);
    let end = convertTo24(endTime);

    let startDelivery = convertTo24("8:00:00 am");
    let endDelivery = convertTo24("10:00:00 pm");

    let idle = 0;

    if(start < startDelivery){
        idle += (startDelivery - start);
    }

    if(end > endDelivery){
        idle += (end - endDelivery);
    }

    if(idle < 0) idle = 0;

    return secondsToTime(idle);
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {

    let shift = timeToSeconds(shiftDuration);
    let idle = timeToSeconds(idleTime);

    let active = shift - idle;

    return secondsToTime(active);
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
let active = timeToSeconds(activeTime);

    let quotaNormal = timeToSeconds("8:24:00");
    let quotaEid = timeToSeconds("6:00:00");

    let eidStart = new Date("2025-04-10");
    let eidEnd = new Date("2025-04-30");
    let d = new Date(date);

    let quota = quotaNormal;

    if(d >= eidStart && d <= eidEnd)
        quota = quotaEid;

    return active >= quota;
}
// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    let data = fs.readFileSync(textFile,"utf8");

if(data.trim() === "") data = "";
    let lines = data.split("\n");

    for(let line of lines){
        let cols = line.split(",");
       if(cols[0].trim() === shiftObj.driverID.trim() &&
   cols[2].trim() === shiftObj.date.trim())
            return {};
    }

    let shiftDuration = getShiftDuration(shiftObj.startTime,shiftObj.endTime);
    let idleTime = getIdleTime(shiftObj.startTime,shiftObj.endTime);
    let activeTime = getActiveTime(shiftDuration,idleTime);
    let quota = metQuota(shiftObj.date,activeTime);

    let newRow = `${shiftObj.driverID},${shiftObj.driverName},${shiftObj.date},${shiftObj.startTime},${shiftObj.endTime},${shiftDuration},${idleTime},${activeTime},${quota},false`;

    fs.appendFileSync(textFile,"\n"+newRow);

    return {
        ...shiftObj,
        shiftDuration,
        idleTime,
        activeTime,
        metQuota: quota,
        hasBonus:false
    };
}



module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
   
};









