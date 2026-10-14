export const RESOURCE_CATALOG = [
  // Operating Systems
  {
    id: 'os-ostep-cpu',
    title: 'OSTEP: CPU Virtualization & Scheduling',
    url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched.pdf',
    type: 'book',
    minutes: 35,
    topic: 'Operating Systems',
    concepts: ['cpu scheduling', 'process states', 'context switching', 'multithreading']
  },
  {
    id: 'os-ostep-deadlocks',
    title: 'OSTEP: Deadlock & Concurrency Problems',
    url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/threads-bugs.pdf',
    type: 'book',
    minutes: 30,
    topic: 'Operating Systems',
    concepts: ['deadlocks', 'bankers algorithm', 'concurrency', 'semaphores', 'mutex']
  },
  {
    id: 'os-gfg-paging',
    title: 'GeeksforGeeks: Paging & Virtual Memory Management',
    url: 'https://www.geeksforgeeks.org/virtual-memory-in-operating-system/',
    type: 'article',
    minutes: 20,
    topic: 'Operating Systems',
    concepts: ['virtual memory', 'paging', 'page replacement', 'tlb', 'segmentation']
  },
  {
    id: 'os-mit-6s081',
    title: 'MIT OCW 6.S081: Operating System Engineering',
    url: 'https://ocw.mit.edu',
    type: 'course',
    minutes: 45,
    topic: 'Operating Systems',
    concepts: ['kernel architecture', 'system calls', 'page tables', 'file systems']
  },
  {
    id: 'os-gfg-sync',
    title: 'GeeksforGeeks: Process Synchronization & Critical Section',
    url: 'https://www.geeksforgeeks.org/process-synchronization-in-operating-system/',
    type: 'article',
    minutes: 25,
    topic: 'Operating Systems',
    concepts: ['process synchronization', 'critical section', 'semaphores', 'peterson solution']
  },

  // Computer Networks
  {
    id: 'cn-kurose-transport',
    title: 'Computer Networking: A Top-Down Approach (Transport Layer)',
    url: 'https://www.geeksforgeeks.org/transport-layer-responsibilities/',
    type: 'book',
    minutes: 30,
    topic: 'Computer Networks',
    concepts: ['tcp', 'udp', 'flow control', 'congestion control', 'three-way handshake']
  },
  {
    id: 'cn-gfg-subnetting',
    title: 'GeeksforGeeks: IP Addressing & Subnetting Guide',
    url: 'https://www.geeksforgeeks.org/introduction-to-subnetting/',
    type: 'article',
    minutes: 25,
    topic: 'Computer Networks',
    concepts: ['ip addressing', 'subnetting', 'cidr', 'network layer', 'routing']
  },
  {
    id: 'cn-stanford-cs144',
    title: 'Stanford CS144: Introduction to Computer Networking',
    url: 'https://cs144.github.io',
    type: 'course',
    minutes: 40,
    topic: 'Computer Networks',
    concepts: ['packet switching', 'dns', 'http', 'routing algorithms']
  },
  {
    id: 'cn-gfg-osi-model',
    title: 'GeeksforGeeks: Layers of OSI Model with Protocols',
    url: 'https://www.geeksforgeeks.org/layers-of-osi-model/',
    type: 'article',
    minutes: 20,
    topic: 'Computer Networks',
    concepts: ['osi model', 'data link layer', 'arp', 'mac addressing']
  },

  // DBMS
  {
    id: 'db-cmu-15445',
    title: 'CMU 15-445: Database Systems (Andy Pavlo)',
    url: 'https://db.cs.cmu.edu',
    type: 'course',
    minutes: 45,
    topic: 'DBMS',
    concepts: ['indexing', 'b-trees', 'buffer pool', 'query execution', 'concurrency control']
  },
  {
    id: 'db-gfg-normalization',
    title: 'GeeksforGeeks: Database Normalization (1NF to BCNF)',
    url: 'https://www.geeksforgeeks.org/database-normalization/',
    type: 'article',
    minutes: 25,
    topic: 'DBMS',
    concepts: ['normalization', 'functional dependency', '1nf', '2nf', '3nf', 'bcnf']
  },
  {
    id: 'db-postgres-internals',
    title: 'PostgreSQL Internals: ACID Transactions & Concurrency',
    url: 'https://www.postgresql.org/docs/current/internals.html',
    type: 'documentation',
    minutes: 30,
    topic: 'DBMS',
    concepts: ['acid properties', 'transactions', 'mvcc', 'two-phase locking', 'isolation levels']
  },
  {
    id: 'db-gfg-indexing',
    title: 'GeeksforGeeks: Indexing in Databases (B-Trees & Hash Indexing)',
    url: 'https://www.geeksforgeeks.org/indexing-in-databases-set-1/',
    type: 'article',
    minutes: 20,
    topic: 'DBMS',
    concepts: ['indexing', 'b-trees', 'b+ trees', 'query optimization']
  },

  // Data Structures & Algorithms
  {
    id: 'dsa-visualgo',
    title: 'VisuAlgo: Visualizing Data Structures and Algorithms',
    url: 'https://visualgo.net',
    type: 'practice',
    minutes: 25,
    topic: 'Data Structures & Algorithms',
    concepts: ['binary search trees', 'graph traversal', 'sorting', 'heaps', 'linked lists']
  },
  {
    id: 'dsa-mit-6006',
    title: 'MIT OCW 6.006: Introduction to Algorithms',
    url: 'https://ocw.mit.edu',
    type: 'course',
    minutes: 45,
    topic: 'Data Structures & Algorithms',
    concepts: ['asymptotic analysis', 'dynamic programming', 'divide and conquer', 'dijkstra']
  },
  {
    id: 'dsa-gfg-dp',
    title: 'GeeksforGeeks: Dynamic Programming Patterns & Memoization',
    url: 'https://www.geeksforgeeks.org/dynamic-programming/',
    type: 'article',
    minutes: 30,
    topic: 'Data Structures & Algorithms',
    concepts: ['dynamic programming', 'recursion', 'memoization', 'knapsack', 'lcs']
  },
  {
    id: 'dsa-gfg-graphs',
    title: 'GeeksforGeeks: Graph Algorithms (BFS, DFS, Shortest Paths)',
    url: 'https://www.geeksforgeeks.org/graph-data-structure-and-algorithms/',
    type: 'article',
    minutes: 30,
    topic: 'Data Structures & Algorithms',
    concepts: ['graphs', 'bfs', 'dfs', 'topological sort', 'minimum spanning tree']
  },

  // Object-Oriented Programming
  {
    id: 'oop-refactoring-guru',
    title: 'Refactoring.Guru: SOLID Principles and Design Patterns',
    url: 'https://refactoring.guru',
    type: 'article',
    minutes: 35,
    topic: 'Object-Oriented Programming',
    concepts: ['solid principles', 'design patterns', 'singleton', 'factory pattern', 'observer pattern']
  },
  {
    id: 'oop-gfg-principles',
    title: 'GeeksforGeeks: 4 Pillars of OOP (Abstraction, Encapsulation, etc.)',
    url: 'https://www.geeksforgeeks.org/object-oriented-programming-oops-concept-in-java/',
    type: 'article',
    minutes: 20,
    topic: 'Object-Oriented Programming',
    concepts: ['encapsulation', 'inheritance', 'polymorphism', 'abstraction', 'interfaces']
  }
];

/**
 * Filter catalog candidates based on test topic and relevant concept keys.
 */
export function selectCandidates(topic, conceptKeys = []) {
  const normKeys = conceptKeys.map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, ''));

  const topicResources = RESOURCE_CATALOG.filter(
    (r) => r.topic.toLowerCase() === (topic || '').toLowerCase()
  );

  if (topicResources.length === 0) {
    // If no direct topic match, return empty array to prompt AI-suggested verified domain resources
    return [];
  }

  if (normKeys.length === 0) {
    return topicResources.slice(0, 8);
  }

  // Sort by relevance to matched concept keys
  const scored = topicResources.map((res) => {
    let score = 0;
    res.concepts.forEach((c) => {
      const cleanC = c.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normKeys.some((k) => cleanC.includes(k) || k.includes(cleanC))) {
        score += 2;
      }
    });
    return { res, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 10).map((s) => s.res);
}
