export const Mode = {
  HIGHEST: 'highest', LOWEST: 'lowest', OLDEST: 'oldest', NEWEST: 'newest'
};

class Node {
  constructor(data, priority, sequence) {
    this.data = data;
    this.priority = priority;
    this.sequence = sequence;
    this.prev = null;
    this.next = null;
    this.maxIndex = -1;
    this.minIndex = -1;
  }
}

class BinaryHeap {
  constructor(compare, indexField) {
    this.items = [];
    this.compare = compare;
    this.indexField = indexField;
  }

  peek() {
    return this.items[0] || null;
  }

  _swap(i, j) {
    [this.items[i], this.items[j]] = [this.items[j], this.items[i]];
    this.items[i][this.indexField] = i;
    this.items[j][this.indexField] = j;
  }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (!this.compare(this.items[i], this.items[parent])) break;
      this._swap(i, parent);
      i = parent;
    }
  }

  _bubbleDown(i) {
    while (true) {
      const left = 2 * i + 1;
      const right = left + 1;
      let best = i;

      if (left < this.items.length && this.compare(this.items[left], this.items[best])) {
        best = left;
      }
      if (right < this.items.length && this.compare(this.items[right], this.items[best])) {
        best = right;
      }
      if (best === i) break;
      this._swap(i, best);
      i = best;
    }
  }

  push(node) {
    node[this.indexField] = this.items.length;
    this.items.push(node);
    this._bubbleUp(this.items.length - 1);
  }

  remove(node) {
    const i = node[this.indexField];
    if (i < 0 || i >= this.items.length || this.items[i] !== node) return;

    const last = this.items.pop();
    node[this.indexField] = -1;

    if (i === this.items.length) return;

    this.items[i] = last;
    last[this.indexField] = i;

    const parent = Math.floor((i - 1) / 2);
    if (i > 0 && this.compare(this.items[i], this.items[parent])) {
      this._bubbleUp(i);
    } else {
      this._bubbleDown(i);
    }
  }
}

export class BiDirectionalPriorityQueue {
  constructor() {
    this.head = null;
    this.tail = null;
    this.sequence = 0;
    this.length = 0;

    this.maxHeap = new BinaryHeap(
      (a, b) => a.priority > b.priority ||
        (a.priority === b.priority && a.sequence < b.sequence),
      'maxIndex'
    );

    this.minHeap = new BinaryHeap(
      (a, b) => a.priority < b.priority ||
        (a.priority === b.priority && a.sequence < b.sequence),
      'minIndex'
    );
  }

  enqueue(item, priority) {
    if (typeof priority !== 'number' || !Number.isFinite(priority)) {
      throw new TypeError('priority must be a finite number');
    }

    const node = new Node(item, priority, this.sequence++);

    if (!this.head) {
      this.head = node;
      this.tail = node;
    } else {
      node.prev = this.tail;
      this.tail.next = node;
      this.tail = node;
    }

    this.maxHeap.push(node);
    this.minHeap.push(node);
    this.length++;
  }

  _validateMode(mode) {
    if (!Object.values(Mode).includes(mode)) {
      throw new RangeError(`Unknown queue mode: ${mode}`);
    }
  }

  _getNode(mode) {
    this._validateMode(mode);

    switch (mode) {
      case Mode.HIGHEST: return this.maxHeap.peek();
      case Mode.LOWEST: return this.minHeap.peek();
      case Mode.OLDEST: return this.head;
      case Mode.NEWEST: return this.tail;
    }
  }

  _unlinkChronology(node) {
    if (node.prev) node.prev.next = node.next;
    else this.head = node.next;

    if (node.next) node.next.prev = node.prev;
    else this.tail = node.prev;

    node.prev = null;
    node.next = null;
  }

  peek(mode) {
    const node = this._getNode(mode);
    return node ? node.data : null;
  }

  dequeue(mode) {
    const node = this._getNode(mode);
    if (!node) return null;

    this._unlinkChronology(node);
    this.maxHeap.remove(node);
    this.minHeap.remove(node);
    this.length--;

    return node.data;
  }

  get size() {
    return this.length;
  }
}
