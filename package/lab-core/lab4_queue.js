export const Mode = {
  HIGHEST: 'highest', LOWEST: 'lowest', OLDEST: 'oldest', NEWEST: 'newest'
};

class Node {
  constructor(data, priority) {
    this.data = data;
    this.priority = priority;
    this.isDeleted = false;
  }
}

export class BiDirectionalPriorityQueue {
  constructor() {
    this.chronology = [];
    this.byPriority = [];
  }

  enqueue(item, priority) {
    const node = new Node(item, priority);
    this.chronology.push(node);
    
    let i = this.byPriority.length - 1;
    while (i >= 0 && this.byPriority[i].priority < priority) i--;
    this.byPriority.splice(i + 1, 0, node);
  }

  _cleanAndGet(mode) {
    const arr = (mode === Mode.HIGHEST || mode === Mode.LOWEST) ? this.byPriority : this.chronology;
    const isEnd = (mode === Mode.LOWEST || mode === Mode.NEWEST);
    
    while (arr.length > 0 && arr[isEnd ? arr.length - 1 : 0].isDeleted) {
      isEnd ? arr.pop() : arr.shift();
    }
    
    return arr.length > 0 ? { arr, index: isEnd ? arr.length - 1 : 0 } : null;
  }

  dequeue(mode) {
    const target = this._cleanAndGet(mode);
    if (!target) return null;

    const node = target.index === 0 ? target.arr.shift() : target.arr.pop();
    node.isDeleted = true;
    return node.data;
  }

  peek(mode) {
    const target = this._cleanAndGet(mode);
    return target ? target.arr[target.index].data : null;
  }
}