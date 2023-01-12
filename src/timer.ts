export class HighResolutionTimer {
  private baseline: number | undefined;
  private timer: NodeJS.Timeout | undefined;

  constructor(public duration_ms: number, public callback: () => void) {}

  run() {
    if (this.baseline === undefined) {
      this.baseline = performance.now() - this.duration_ms;
    }
    this.callback();
    const end = performance.now();
    this.baseline += this.duration_ms;

    const nextTick = Math.max(0, this.duration_ms - (end - this.baseline));
    console.log(nextTick);
    this.timer = setTimeout(() => {
      this.run();
    }, nextTick);
  }

  stop() {
    clearTimeout(this.timer);
  }
}

// export function Interval(fn,duration,...args){
//     const _this = this;
//     this.baseline = undefined

//     this.run = function(flag){
//         if(_this.baseline === undefined){
//             _this.baseline = new Date().getTime() - duration
//         }
//         if (flag){
//             fn(...args);
//         }
//         const end = new Date().getTime();
//         _this.baseline += duration

//         let nextTick = duration - (end - _this.baseline);
//         if(nextTick<0){
//             nextTick = 0
//         }

//         console.log(nextTick);
//         _this.timer = setTimeout(function(){
//             _this.run(true)
//         }, nextTick)
//     }

//     this.stop = function(){
//         clearTimeout(_this.timer)
//     }
// }
