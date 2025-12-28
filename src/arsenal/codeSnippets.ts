export type Snippet = {
  id: string;
  title: string;
  tags: string[];
  code: string;
};

export const CODE_SNIPPETS: Snippet[] = [
  {
    id: "hello-console",
    title: "Console: basic prints",
    tags: ["console", "basic"],
    code: `console.log("hello");
console.log("number:", 7);
console.log("sum:", 2 + 5);`,
  },
  {
    id: "vars-basic",
    title: "Variables: let/const + updates",
    tags: ["variables", "let", "const", "basic"],
    code: `let x = 2;
const y = 10;

console.log("x:", x);
x = x + 3;
console.log("x after:", x);

console.log("y:", y);`,
  },
  {
    id: "assignment-expression-basic",
    title: "AssignmentExpression inside expression",
    tags: ["assignment", "expression", "basic"],
    code: `let x = 0;
console.log("start:", x);

console.log("assign result:", (x = 5));
console.log("x now:", x);

console.log("compound:", (x += 3));
console.log("x end:", x);`,
  },
  {
    id: "if-else-basic",
    title: "If / Else",
    tags: ["if", "conditions", "basic"],
    code: `let score = 73;

if (score >= 90) {
  console.log("A");
} else if (score >= 80) {
  console.log("B");
} else if (score >= 70) {
  console.log("C");
} else {
  console.log("D");
}`,
  },
  {
    id: "logical-short-circuit",
    title: "Logical operators: && / || short circuit",
    tags: ["logical", "operators", "basic"],
    code: `let x = 0;

console.log("a:", x && (x = 10));
console.log("x:", x);

console.log("b:", x || (x = 7));
console.log("x:", x);`,
  },
  {
    id: "while-basic",
    title: "While loop: counting",
    tags: ["while", "loop", "basic"],
    code: `let i = 1;
while (i <= 5) {
  console.log("i:", i);
  i = i + 1;
}`,
  },
  {
    id: "while-break-continue",
    title: "While: break + continue",
    tags: ["while", "break", "continue"],
    code: `let i = 0;
while (i < 10) {
  i += 1;

  if (i % 2 === 0) continue;
  if (i === 9) break;

  console.log("odd:", i);
}`,
  },
  {
    id: "for-basic",
    title: "For loop: sum 1..n",
    tags: ["for", "loop", "basic"],
    code: `let n = 10;
let sum = 0;

for (let i = 1; i <= n; i += 1) {
  sum += i;
}

console.log("sum:", sum);`,
  },
  {
    id: "for-break-continue",
    title: "For: break + continue",
    tags: ["for", "break", "continue"],
    code: `let sum = 0;

for (let i = 1; i <= 10; i += 1) {
  if (i === 3) continue;
  if (i === 8) break;
  sum += i;
}

console.log("sum:", sum);`,
  },
  {
    id: "functions-basic",
    title: "Functions: parameters + return",
    tags: ["function", "return", "basic"],
    code: `function add(a, b) {
  return a + b;
}

function mul(a, b) {
  return a * b;
}

console.log("add:", add(2, 5));
console.log("mul:", mul(3, 4));`,
  },
  {
    id: "recursion-factorial",
    title: "Recursion: factorial",
    tags: ["recursion", "math"],
    code: `function fact(n) {
  if (n <= 1) return 1;
  return n * fact(n - 1);
}

console.log("fact(6):", fact(6));`,
  },
  {
    id: "recursion-fibonacci",
    title: "Recursion: fibonacci (slow but visual)",
    tags: ["recursion", "fibonacci"],
    code: `function fib(n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}

console.log("fib(8):", fib(8));`,
  },
  {
    id: "recursion-sum-array",
    title: "Recursion: sum array (by index)",
    tags: ["recursion", "array"],
    code: `let arr = [3, 7, 2, 9];

function sumAt(a, i) {
  if (i >= a.length()) return 0;
  return a[i] + sumAt(a, i + 1);
}

console.log("sum:", sumAt(arr, 0));`,
  },
  {
    id: "array-basic-indexing",
    title: "Array: create + index + assignment",
    tags: ["array", "index", "assignment"],
    code: `let a = [10, 20, 30];

console.log("a[0]:", a[0]);
console.log("a[2]:", a[2]);

a[1] = 99;
console.log("after:", a[0], a[1], a[2]);`,
  },
  {
    id: "array-length-method",
    title: "Array: length() as method",
    tags: ["array", "length"],
    code: `let a = [1, 2, 3, 4];

console.log("len:", a.length());
a.push(5);
console.log("len after push:", a.length());`,
  },
  {
    id: "array-push-pop",
    title: "Array: push / pop",
    tags: ["array", "push", "pop"],
    code: `let a = [];
a.push(1);
a.push(2);
a.push(3);

console.log("len:", a.length());
console.log("pop:", a.pop());
console.log("pop:", a.pop());
console.log("len:", a.length());`,
  },
  {
    id: "array-shift-unshift",
    title: "Array: shift / unshift",
    tags: ["array", "shift", "unshift"],
    code: `let a = [2, 3];

a.unshift(1);
console.log("first:", a[0], "len:", a.length());

console.log("shift:", a.shift());
console.log("now first:", a[0], "len:", a.length());`,
  },
  {
    id: "array-loop-find-max",
    title: "Array: loop find max",
    tags: ["array", "loop", "max"],
    code: `let a = [7, 2, 9, 4, 9, 1];

let best = a[0];
for (let i = 1; i < a.length(); i += 1) {
  if (a[i] > best) best = a[i];
}

console.log("max:", best);`,
  },
  {
    id: "object-basic",
    title: "Object: create + read/write props",
    tags: ["object", "props", "basic"],
    code: `let user = {
  name: "Noa",
  age: 21
};

console.log("name:", user.name);
user.age = user.age + 1;
console.log("age:", user.age);`,
  },
  {
    id: "object-computed-prop",
    title: "Object: computed prop access",
    tags: ["object", "computed", "member"],
    code: `let key = "points";
let p = { points: 10 };

console.log("before:", p[key]);
p[key] = p[key] + 5;
console.log("after:", p[key]);`,
  },
  {
    id: "assignment-to-member",
    title: "AssignmentExpression: obj.a = ... and arr[i] = ...",
    tags: ["assignment", "member", "array", "object"],
    code: `let obj = { count: 1 };
let arr = [5, 6, 7];

console.log("before:", obj.count, arr[1]);

obj.count = obj.count + 10;
arr[1] = arr[1] * 3;

console.log("after:", obj.count, arr[1]);`,
  },
  {
    id: "stack-basic",
    title: "Stack: push / pop / peek / size",
    tags: ["stack", "ds", "basic"],
    code: `let s = Stack();
s.push(1);
s.push(2);
s.push(3);

console.log("peek:", s.peek());
console.log("size:", s.size());
console.log("pop:", s.pop());
console.log("peek:", s.peek());`,
  },
  {
    id: "queue-basic",
    title: "Queue: enqueue / dequeue / peek / size",
    tags: ["queue", "ds", "basic"],
    code: `let q = Queue();
q.enqueue(10);
q.enqueue(20);
q.enqueue(30);

console.log("peek:", q.peek());
console.log("size:", q.size());
console.log("dequeue:", q.dequeue());
console.log("dequeue:", q.dequeue());
console.log("size:", q.size());`,
  },
  {
    id: "btree-basic",
    title: "BinaryTree: insert / contains / inOrder",
    tags: ["tree", "binarytree", "ds"],
    code: `let t = BinaryTree();
t.insert(5);
t.insert(2);
t.insert(8);
t.insert(1);
t.insert(3);

console.log("contains 2:", t.contains(2));
console.log("contains 7:", t.contains(7));

let sorted = t.inOrder();
console.log("inOrder len:", sorted.length());
console.log("inOrder[0]:", sorted[0]);
console.log("inOrder[4]:", sorted[4]);`,
  },
  {
    id: "btree-inorder-to-array-sum",
    title: "BinaryTree: inOrder then sum array",
    tags: ["tree", "array", "loop"],
    code: `let t = BinaryTree();
t.insert(10);
t.insert(4);
t.insert(15);
t.insert(2);
t.insert(6);

let a = t.inOrder();

let sum = 0;
for (let i = 0; i < a.length(); i += 1) {
  sum += a[i];
}

console.log("sorted sum:", sum);`,
  },
  {
    id: "classes-basic",
    title: "Classes: constructor + method",
    tags: ["class", "oop", "basic"],
    code: `class User {
  constructor(name) {
    this.name = name;
    this.points = 0;
  }
  addPoints(x) {
    this.points = this.points + x;
    console.log("points:", this.points);
  }
}

let u = new User("Dana");
u.addPoints(5);
u.addPoints(7);`,
  },
  {
    id: "classes-inheritance-super",
    title: "Inheritance: extends + super + override",
    tags: ["class", "inheritance", "super"],
    code: `class Animal {
  constructor(name) {
    this.name = name;
    this.kind = "animal";
  }
  speak() {
    console.log("Animal:", this.name);
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name);
    this.breed = breed;
  }
  speak() {
    super.speak();
    console.log("Dog:", this.name, this.breed);
  }
}

let d = new Dog("Bobi", "Husky");
d.speak();`,
  },
  {
    id: "classes-stateful-counter",
    title: "Class example: counter with internal state",
    tags: ["class", "state", "assignment"],
    code: `class Counter {
  constructor() {
    this.count = 0;
  }
  inc() {
    this.count = this.count + 1;
    return this.count;
  }
  add(x) {
    this.count += x;
    return this.count;
  }
}

let c = new Counter();
console.log("inc:", c.inc());
console.log("inc:", c.inc());
console.log("add 5:", c.add(5));`,
  },
  {
    id: "algo-two-sum-bruteforce",
    title: "Algorithm: Two Sum (brute force)",
    tags: ["algorithm", "array", "loops"],
    code: `let nums = [2, 7, 11, 15];
let target = 9;

let iFound = -1;
let jFound = -1;

for (let i = 0; i < nums.length(); i += 1) {
  for (let j = i + 1; j < nums.length(); j += 1) {
    if (nums[i] + nums[j] === target) {
      iFound = i;
      jFound = j;
      break;
    }
  }
  if (iFound !== -1) break;
}

console.log("indices:", iFound, jFound);
console.log("values:", nums[iFound], nums[jFound]);`,
  },
  {
    id: "algo-count-evens",
    title: "Algorithm: count evens with continue",
    tags: ["algorithm", "loop", "continue"],
    code: `let a = [1, 2, 3, 4, 5, 6, 7];

let count = 0;
for (let i = 0; i < a.length(); i += 1) {
  if (a[i] % 2 !== 0) continue;
  count += 1;
}

console.log("even count:", count);`,
  },
  {
    id: "algo-reverse-array-in-place",
    title: "Algorithm: reverse array in place",
    tags: ["algorithm", "array", "swap"],
    code: `let a = [10, 20, 30, 40, 50];

let i = 0;
let j = a.length() - 1;

while (i < j) {
  let tmp = a[i];
  a[i] = a[j];
  a[j] = tmp;

  i += 1;
  j -= 1;
}

console.log("reversed:", a[0], a[1], a[2], a[3], a[4]);`,
  },{
    id: "stack-reverse-array",
    title: "Stack: reverse array using push/pop",
    tags: ["stack", "array", "reverse"],
    code: `let a = [1, 2, 3, 4, 5];
let s = Stack();

for (let i = 0; i < a.length(); i += 1) {
  s.push(a[i]);
}

let b = [];
while (s.size() > 0) {
  b.push(s.pop());
}

console.log("a:", a[0], a[1], a[2], a[3], a[4]);
console.log("b:", b[0], b[1], b[2], b[3], b[4]);`,
  },
  {
    id: "stack-check-parentheses",
    title: "Stack: parentheses check (simple) using chars array",
    tags: ["stack", "algorithm", "parentheses"],
    code: `let chars = ["(", "(", ")", "(", ")", ")"];
let s = Stack();
let ok = 1;

for (let i = 0; i < chars.length(); i += 1) {
  if (chars[i] === "(") {
    s.push("(");
  } else {
    if (s.size() === 0) {
      ok = 0;
      break;
    }
    s.pop();
  }
}

if (ok === 1 && s.size() === 0) {
  console.log("valid");
} else {
  console.log("invalid");
}`,
  },
  {
    id: "stack-min-tracker",
    title: "Stack: track min while pushing",
    tags: ["stack", "algorithm", "min"],
    code: `let nums = [5, 2, 9, 1, 7];
let s = Stack();
let minStack = Stack();

for (let i = 0; i < nums.length(); i += 1) {
  let x = nums[i];
  s.push(x);

  if (minStack.size() === 0) {
    minStack.push(x);
  } else {
    let currentMin = minStack.peek();
    if (x < currentMin) minStack.push(x);
    else minStack.push(currentMin);
  }

  console.log("push:", x, "min now:", minStack.peek());
}

while (s.size() > 0) {
  console.log("pop:", s.pop(), "min was:", minStack.pop());
}`,
  },
  {
    id: "stack-eval-rpn-simple",
    title: "Stack: evaluate RPN expression (numbers + +, *)",
    tags: ["stack", "algorithm", "rpn"],
    code: `let tokens = [2, 3, "+", 4, "*"];
let s = Stack();

for (let i = 0; i < tokens.length(); i += 1) {
  let t = tokens[i];

  if (t === "+") {
    let b = s.pop();
    let a = s.pop();
    s.push(a + b);
  } else if (t === "*") {
    let b = s.pop();
    let a = s.pop();
    s.push(a * b);
  } else {
    s.push(t);
  }
}

console.log("result:", s.pop());`,
  },
  {
    id: "stack-callstack-demo",
    title: "Stack: simulate call stack frames manually",
    tags: ["stack", "concept", "callstack"],
    code: `let frames = Stack();

function enter(name) {
  frames.push(name);
  console.log("enter:", name, "top:", frames.peek(), "size:", frames.size());
}

function exit() {
  console.log("exit:", frames.pop(), "size:", frames.size());
}

enter("main");
enter("fact(4)");
enter("fact(3)");
exit();
exit();
exit();`,
  },

  {
    id: "queue-basic-flow",
    title: "Queue: process tasks FIFO",
    tags: ["queue", "fifo", "basic"],
    code: `let q = Queue();

q.enqueue("task A");
q.enqueue("task B");
q.enqueue("task C");

while (q.size() > 0) {
  let t = q.dequeue();
  console.log("processing:", t);
}`,
  },
  {
    id: "queue-hot-potato",
    title: "Queue: Hot Potato game (rotate then remove)",
    tags: ["queue", "game", "algorithm"],
    code: `let players = ["Noa", "Amit", "Dana", "Eli", "Maya"];
let q = Queue();

for (let i = 0; i < players.length(); i += 1) {
  q.enqueue(players[i]);
}

let passes = 3;

while (q.size() > 1) {
  for (let i = 0; i < passes; i += 1) {
    q.enqueue(q.dequeue());
  }
  let out = q.dequeue();
  console.log("out:", out);
}

console.log("winner:", q.dequeue());`,
  },
  {
    id: "queue-bfs-level-order-simple",
    title: "Queue: BFS style on array graph",
    tags: ["queue", "bfs", "graph"],
    code: `let adj = [
  [1, 2],
  [0, 3],
  [0, 3],
  [1, 2, 4],
  [3]
];

let start = 0;

let q = Queue();
let visited = [0, 0, 0, 0, 0];

visited[start] = 1;
q.enqueue(start);

while (q.size() > 0) {
  let u = q.dequeue();
  console.log("visit:", u);

  let neigh = adj[u];
  for (let i = 0; i < neigh.length(); i += 1) {
    let v = neigh[i];
    if (visited[v] === 0) {
      visited[v] = 1;
      q.enqueue(v);
    }
  }
}`,
  },
  {
    id: "queue-sliding-window-sum",
    title: "Queue: sliding window sum (k=3) using queue",
    tags: ["queue", "window", "algorithm"],
    code: `let a = [1, 2, 3, 4, 5, 6];
let k = 3;

let q = Queue();
let sum = 0;

for (let i = 0; i < a.length(); i += 1) {
  q.enqueue(a[i]);
  sum += a[i];

  if (q.size() > k) {
    sum -= q.dequeue();
  }

  if (q.size() === k) {
    console.log("window ending at", i, "sum:", sum);
  }
}`,
  },
  {
    id: "queue-two-queues-stack",
    title: "Queue: build Stack using two Queues (concept)",
    tags: ["queue", "stack", "concept"],
    code: `let q1 = Queue();
let q2 = Queue();

function push(x) {
  q2.enqueue(x);
  while (q1.size() > 0) {
    q2.enqueue(q1.dequeue());
  }
  let tmp = q1;
  q1 = q2;
  q2 = tmp;
}

function pop() {
  return q1.dequeue();
}

push(10);
push(20);
push(30);

console.log(pop());
console.log(pop());
console.log(pop());`,
  },

  {
    id: "btree-inorder-sorted-check",
    title: "BinaryTree: inOrder gives sorted array (BST check)",
    tags: ["binarytree", "bst", "inorder"],
    code: `let t = BinaryTree();
t.insert(8);
t.insert(3);
t.insert(10);
t.insert(1);
t.insert(6);
t.insert(14);
t.insert(4);
t.insert(7);
t.insert(13);

let a = t.inOrder();

let ok = 1;
for (let i = 1; i < a.length(); i += 1) {
  if (a[i] < a[i - 1]) {
    ok = 0;
    break;
  }
}

console.log("inOrder sorted:", ok === 1);`,
  },
  {
    id: "btree-count-nodes",
    title: "BinaryTree: count nodes by inOrder length",
    tags: ["binarytree", "count", "inorder"],
    code: `let t = BinaryTree();
t.insert(5);
t.insert(2);
t.insert(8);
t.insert(1);
t.insert(3);

let a = t.inOrder();
console.log("nodes:", a.length());`,
  },
  {
    id: "btree-sum-values",
    title: "BinaryTree: sum values using inOrder array",
    tags: ["binarytree", "sum", "array"],
    code: `let t = BinaryTree();
t.insert(10);
t.insert(5);
t.insert(15);
t.insert(3);
t.insert(7);

let a = t.inOrder();

let sum = 0;
for (let i = 0; i < a.length(); i += 1) {
  sum += a[i];
}

console.log("sum:", sum);`,
  },
  {
    id: "btree-find-kth-smallest",
    title: "BinaryTree: kth smallest using inOrder",
    tags: ["binarytree", "bst", "kth"],
    code: `let t = BinaryTree();
t.insert(8);
t.insert(3);
t.insert(10);
t.insert(1);
t.insert(6);
t.insert(14);
t.insert(4);
t.insert(7);
t.insert(13);

let k = 5;
let a = t.inOrder();

console.log("kth:", a[k - 1]);`,
  },
  {
    id: "btree-delete-logical-rebuild",
    title: "BinaryTree: 'delete' value by rebuilding tree (works now)",
    tags: ["binarytree", "delete", "rebuild"],
    code: `let t = BinaryTree();
t.insert(8);
t.insert(3);
t.insert(10);
t.insert(1);
t.insert(6);
t.insert(14);
t.insert(4);
t.insert(7);
t.insert(13);

let del = 6;

let a = t.inOrder();
let t2 = BinaryTree();

for (let i = 0; i < a.length(); i += 1) {
  if (a[i] === del) continue;
  t2.insert(a[i]);
}

console.log("old contains del:", t.contains(del));
console.log("new contains del:", t2.contains(del));
console.log("new inorder:", t2.inOrder());`,
  },
  {
    id: "btree-range-filter-rebuild",
    title: "BinaryTree: keep only values in range (rebuild)",
    tags: ["binarytree", "filter", "range"],
    code: `let t = BinaryTree();
t.insert(20);
t.insert(10);
t.insert(30);
t.insert(5);
t.insert(15);
t.insert(25);
t.insert(35);

let low = 12;
let high = 30;

let a = t.inOrder();
let t2 = BinaryTree();

for (let i = 0; i < a.length(); i += 1) {
  let x = a[i];
  if (x < low) continue;
  if (x > high) continue;
  t2.insert(x);
}

console.log("filtered inorder:", t2.inOrder());`,
  },
];
