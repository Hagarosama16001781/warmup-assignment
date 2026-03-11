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
// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
       let data = fs.readFileSync(textFile,"utf8").trim();
    let lines = data.split("\n");

    for(let i=0;i<lines.length;i++){
        let cols = lines[i].split(",");

        if(cols[0].trim() === driverID && cols[2].trim() === date){
            cols[9] = newValue.toString();
            lines[i] = cols.join(",");
        }
    }

    fs.writeFileSync(textFile,lines.join("\n"));

}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {

    let lines = fs.readFileSync(textFile,"utf8").trim().split("\n");

    let count = 0;
    let driverFound = false;

    let inputMonth = parseInt(month);

    for(let line of lines){

        if(line.trim() === "") continue;

        let cols = line.split(",");
        if(cols.length < 10) continue;

        let id = cols[0].trim();
        let date = cols[2].trim();
        let bonus = cols[9].trim();

        if(id === driverID){

            driverFound = true;

            let fileMonth = parseInt(date.split("-")[1]);

            if(fileMonth === inputMonth && bonus === "true"){
                count++;
            }
        }
    }

    if(!driverFound) return -1;

    return count;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {

    let data = fs.readFileSync(textFile,"utf8").trim();
    let lines = data.split("\n");

    let total = 0;

    for(let line of lines){

        if(line.trim() === "") continue;

        let cols = line.split(",");

        if(cols.length < 10) continue;

        let id = cols[0];
        let date = cols[2];
        let activeTime = cols[7];

        let m = date.split("-")[1];

        if(id === driverID && Number(m) === Number(month)){
            total += timeToSeconds(activeTime);
        }
    }

    return secondsToTime(total);
}

 

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month){

    let shifts = fs.readFileSync(textFile,"utf8").trim().split("\n");
    let rates = fs.readFileSync(rateFile,"utf8").trim().split("\n");

    let dayOff = "";

    for(let line of rates){
        let parts = line.split(",");
        if(parts[0] === driverID){
            dayOff = parts[1];
            break;
        }
    }

    let total = 0;

    for(let line of shifts){

        if(line.trim() === "") continue;

        let cols = line.split(",");

        if(cols.length < 10) continue;

        let id = cols[0];
        let date = cols[2];

        if(id !== driverID) continue;

        let d = new Date(date);
        let m = d.getMonth() + 1;

        if(m !== Number(month)) continue;

        let weekday = d.toLocaleDateString("en-US",{weekday:"long"});

        if(weekday === dayOff) continue;

        if(date >= "2025-04-10" && date <= "2025-04-30"){
            total += timeToSeconds("6:00:00");
        }
        else{
            total += timeToSeconds("8:24:00");
        }
    }

    total -= bonusCount * timeToSeconds("2:00:00");

    if(total < 0) total = 0;

    return secondsToTime(total);
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile){

    let rates = fs.readFileSync(rateFile,"utf8").trim().split("\n");

    let basePay = 0;
    let tier = 0;

    for(let line of rates){
        let parts = line.split(",");

        if(parts[0] === driverID){
            basePay = Number(parts[2]);
            tier = Number(parts[3]);
            break;
        }
    }

    let actual = timeToSeconds(actualHours);
    let required = timeToSeconds(requiredHours);

    if(actual >= required) return basePay;

    let missingSeconds = required - actual;
    let missingHours = Math.floor(missingSeconds / 3600);

    let allowance = 0;

    if(tier === 1) allowance = 50;
    if(tier === 2) allowance = 20;
    if(tier === 3) allowance = 10;
    if(tier === 4) allowance = 3;

    let billable = missingHours - allowance;

    if(billable < 0) billable = 0;

    let deductionRate = Math.floor(basePay / 185);

    let deduction = billable * deductionRate;

    return basePay - deduction;
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};















