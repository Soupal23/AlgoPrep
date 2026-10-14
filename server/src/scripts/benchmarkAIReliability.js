import { generateGeminiContent } from '../utils/geminiClient.js';
import { aiGeneratedTestSchema } from '../utils/geminiGenerator.js';
import { config } from '../config/env.js';

// 35 realistic, diverse Computer Science syllabi excerpts
const SYLLABI = [
  { topic: 'Operating Systems - Deadlocks & Process Sync', text: 'Unit 3: Process Synchronization and Deadlocks. Critical Section problem, Peterson algorithm, hardware synchronization, Semaphores, Classic synchronization problems: Dining Philosophers, Readers-Writers, Producer-Consumer. Deadlock characterization, Resource-allocation graph, Deadlock prevention, Deadlock avoidance: Banker algorithm, Deadlock detection and recovery.' },
  { topic: 'Data Structures - Balanced Trees & Heaps', text: 'Module 2: Self-balancing BSTs and Priority Queues. AVL Tree rotations (LL, RR, LR, RL), Red-Black trees properties and recoloring, B-Trees and B+ Trees node splitting and deletion, Binary Min/Max Heaps, Heapify algorithm in O(N), Priority Queue implementations.' },
  { topic: 'Computer Networks - Transport Layer', text: 'Chapter 5: Transport Layer Protocols. UDP vs TCP socket architecture. TCP Connection establishment 3-way handshake, TCP connection teardown, TCP Flow Control: sliding window protocol. TCP Congestion Control: Slow Start, Congestion Avoidance, Fast Retransmit, Fast Recovery.' },
  { topic: 'Database Systems - Normalization & Indexing', text: 'Section 4: Relational Database Design and Query Optimization. Functional dependencies, Armstrong axioms. Normal forms: 1NF, 2NF, 3NF, BCNF, 4NF. Lossless join decomposition and dependency preservation. B+ Tree indexing, clustered vs unclustered indexes, Hash indexing, query execution plans.' },
  { topic: 'System Design - Distributed Caching & Sharding', text: 'Distributed Architecture: Cache Aside vs Write-Through vs Write-Back strategies. Cache eviction policies: LRU, LFU, FIFO. Database horizontal partitioning, Consistent Hashing with virtual nodes, Split-brain scenarios, Replication lag in leader-follower topologies.' },
  { topic: 'Algorithms - Dynamic Programming', text: 'Advanced Algorithms: Dynamic Programming paradigm. Optimal substructure and overlapping subproblems. Memoization vs Tabulation. Classic problems: Longest Common Subsequence (LCS), 0/1 Knapsack problem, Matrix Chain Multiplication, Bellman-Ford shortest paths, Edit Distance.' },
  { topic: 'Cybersecurity - Cryptography & Web Security', text: 'Information Security Principles: Symmetric vs Asymmetric key cryptography. AES and RSA key exchange algorithms. Cryptographic hash functions: SHA-256 and MD5 collision resistance. Web application vulnerabilities: Cross-Site Scripting (XSS), SQL Injection, Cross-Site Request Forgery (CSRF), HTTPS handshake.' },
  { topic: 'Object-Oriented Design - SOLID & GoF Patterns', text: 'Software Engineering Design: SOLID design principles: Single Responsibility, Open-Closed, Liskov Substitution, Interface Segregation, Dependency Inversion. Creational patterns: Factory Method, Singleton, Builder. Structural patterns: Adapter, Decorator. Behavioral patterns: Observer, Strategy.' },
  { topic: 'Computer Architecture - Pipelining & Cache', text: 'Computer Organization: RISC-V 5-stage instruction pipeline: IF, ID, EX, MEM, WB. Pipeline hazards: Structural, Data hazards (forwarding, stalls), Control hazards (branch prediction). Memory hierarchy: Cache mapping techniques: Direct-mapped, Fully associative, Set-associative caches. Cache miss types: Compulsory, Capacity, Conflict.' },
  { topic: 'Distributed Systems - Consensus & Clock Sync', text: 'Distributed Systems: Logical vs Physical Clocks. Lamport timestamps and Vector clocks. Distributed Mutual Exclusion algorithms. Consensus in asynchronous systems: Paxos protocol phases, Raft leader election and log replication, Byzantine Generals problem and Fault Tolerance.' },
  { topic: 'Machine Learning - Supervised Fundamentals', text: 'CS701 Introduction to Machine Learning: Supervised learning fundamentals. Linear Regression, Ordinary Least Squares, Cost functions and Gradient Descent. Logistic Regression and Decision Boundaries. Overfitting, Regularization: L1 (Lasso) vs L2 (Ridge). Bias-Variance Tradeoff, Precision, Recall, F1-Score, ROC-AUC.' },
  { topic: 'Compiler Design - Parsing & ASTs', text: 'Compiler Construction: Lexical Analysis with Finite Automata. Context-Free Grammars and Ambiguity. Top-down parsing: Recursive Descent, LL(1) parsing tables. Bottom-up parsing: Shift-Reduce, LR(0), SLR(1), LALR(1), LR(1). Abstract Syntax Tree (AST) construction and Semantic Analysis.' },
  { topic: 'Cloud Computing - Containers & Kubernetes', text: 'Cloud Infrastructure: Virtualization vs Containerization. Linux namespaces and cgroups. Docker image layering and daemon. Kubernetes architectural components: kube-apiserver, etcd, kube-scheduler, kube-proxy, kubelet. Pod lifecycle, ReplicaSets, Deployments, ClusterIP vs NodePort vs LoadBalancer services.' },
  { topic: 'Software Testing - TDD & CI/CD', text: 'Software Quality Assurance: Unit testing vs Integration testing vs End-to-End testing. Test-Driven Development (TDD) red-green-refactor cycle. Mocking, Stubbing, Code Coverage metrics (Line vs Branch coverage). Continuous Integration and Continuous Deployment (CI/CD) pipelines, Canary releases, Blue-Green deployments.' },
  { topic: 'Graph Theory & Network Flows', text: 'Graph Algorithms: Depth-First Search (DFS) and Breadth-First Search (BFS) applications. Topological Sorting in DAGs, Strongly Connected Components (Tarjan / Kosaraju). Minimum Spanning Trees (Kruskal, Prim). Max-Flow Min-Cut theorem, Ford-Fulkerson algorithm, Edmonds-Karp.' },
  { topic: 'Deep Learning - Neural Architectures', text: 'Deep Learning Foundations: Feedforward Artificial Neural Networks, Activation functions: ReLU, Sigmoid, GELU, LeakyReLU. Backpropagation calculus. Convolutional Neural Networks (CNNs): Kernels, Strides, Pooling. Recurrent Neural Networks (RNNs) and Long Short-Term Memory (LSTM) vanishing gradients.' },
  { topic: 'Natural Language Processing - Transformers', text: 'Modern NLP: Word embeddings (Word2Vec, GloVe). Self-Attention mechanism, Query-Key-Value matrix formulation, Multi-Head Attention. Scaled dot-product attention, Positional Encoding. Transformer Encoder-Decoder architectures (BERT vs GPT vs T5). Tokenization: Byte-Pair Encoding (BPE).' },
  { topic: 'Microservices & Message Brokers', text: 'Distributed Service Architecture: Monolith vs Microservices decomposition. Inter-service communication: synchronous REST/gRPC vs asynchronous Event-Driven architecture. Message Brokers: Apache Kafka partitioned log model, RabbitMQ AMQP exchange topologies. Distributed transactions: Sagas vs 2-Phase Commit.' },
  { topic: 'Web Development - Browser Internals & DOM', text: 'Front-End Engineering: Critical Rendering Path: HTML parsing, DOM tree construction, CSSOM creation, Render tree calculation, Layout, Paint, Composite. JavaScript event loop: Call stack, Web APIs, Task Queue, Microtask Queue. Service Workers, WebSockets vs Server-Sent Events (SSE).' },
  { topic: 'Linear Algebra for Computing', text: 'Mathematics for CS: Vector spaces, Linear independence, Basis and Dimension. Matrix operations, Determinants, Matrix Inversion. Eigenvalues and Eigenvectors. Spectral decomposition. Singular Value Decomposition (SVD) and Principal Component Analysis (PCA) dimensionality reduction.' },
  { topic: 'Probability & Statistics for Data Science', text: 'Statistical Methods: Discrete vs Continuous random variables. Probability distributions: Bernoulli, Binomial, Poisson, Normal, Exponential. Central Limit Theorem. Bayes Theorem and Bayesian inference. Hypothesis testing: Null hypothesis, p-values, Type I and Type II errors, z-test, t-test.' },
  { topic: 'Embedded Systems & Real-Time OS', text: 'Real-Time Computing: Hard vs Soft real-time systems. Interrupt latency and Interrupt Service Routines (ISRs). Real-Time Operating System (RTOS) scheduling: Rate Monotonic Scheduling (RMS), Earliest Deadline First (EDF). Priority Inversion and Priority Inheritance Protocol.' },
  { topic: 'Theory of Computation - Automata & Decidability', text: 'Formal Languages and Automata: Deterministic Finite Automata (DFA) and Non-deterministic Finite Automata (NFA). Regular Expressions, Pumping Lemma for Regular Languages. Context-Free Grammars and Pushdown Automata (PDA). Turing Machines, Halting Problem, Decidability, Church-Turing thesis.' },
  { topic: 'NoSQL Databases & Eventual Consistency', text: 'Modern Data Stores: CAP Theorem: Consistency, Availability, Partition Tolerance. PACELC theorem. Key-Value stores (Redis), Document databases (MongoDB), Column-family stores (Cassandra), Graph databases (Neo4j). BASE properties, Vector clocks, Conflict-free Replicated Data Types (CRDTs).' },
  { topic: 'Computer Graphics - Rendering Pipeline', text: 'Visual Computing: 3D Transformations: Translation, Rotation, Scaling using 4x4 Homogeneous coordinates. Viewing pipeline: Model, World, View, Projection spaces. Rasterization, Depth buffering (Z-buffer). Shading models: Flat, Gouraud, Phong shading. Ray Tracing fundamentals.' },
  { topic: 'Information Retrieval & Search Engines', text: 'Search Architecture: Inverted Index construction, Tokenization, Stemming, Stop-word removal. Vector Space Model, TF-IDF term weighting. BM25 scoring function. PageRank link analysis algorithm, Web crawling politeness and frontier queues.' },
  { topic: 'Mobile Computing & Android Architecture', text: 'Mobile Systems: Android OS stack: Linux Kernel, HAL, ART runtime, Application Framework. Android Activity lifecycle: onCreate, onStart, onResume, onPause, onStop, onDestroy. Intents, Broadcast Receivers, Content Providers, Services. SQLite local storage.' },
  { topic: 'Site Reliability Engineering & Observability', text: 'SRE Practices: Service Level Indicators (SLIs), Service Level Objectives (SLOs), Service Level Agreements (SLAs). Error Budgets. The Three Pillars of Observability: Metrics (Time-series, Prometheus), Logs (Structured logging, ELK), Traces (Distributed tracing, OpenTelemetry).' },
  { topic: 'Functional Programming - Paradigms & Lambda', text: 'Declarative Programming: Pure functions, Immutability, Referential transparency. First-class and Higher-Order functions (map, filter, fold/reduce). Currying and Partial Application. Monads and Functors. Tail-call optimization and lazy evaluation.' },
  { topic: 'Quantum Computing Fundamentals', text: 'Quantum Information: Classical bits vs Qubits, Bloch Sphere representation. Quantum Superposition and Quantum Entanglement. Quantum gates: Pauli-X, Pauli-Y, Pauli-Z, Hadamard, CNOT. Quantum Circuits, No-Cloning theorem. Deutsch-Jozsa algorithm and Grover search overview.' },
  { topic: 'DevSecOps & Secrets Management', text: 'Security Automation: Secure Software Development Life Cycle (SSDLC). Static Application Security Testing (SAST) vs Dynamic Application Security Testing (DAST). Software Bill of Materials (SBOM) and supply-chain vulnerabilities. HashiCorp Vault, KMS envelope encryption, Least Privilege IAM roles.' },
  { topic: 'Advanced SQL & Window Functions', text: 'Complex Querying: Common Table Expressions (CTEs), Recursive CTEs. SQL Window functions: ROW_NUMBER(), RANK(), DENSE_RANK(), NTILE(), LAG(), LEAD(). Aggregation over sliding frames (ROWS BETWEEN). Lateral Joins, Index-only scans, VACUUM and MVCC internal structures.' },
  { topic: 'APIs & Integration Architecture', text: 'Enterprise Architecture: RESTful design principles and Richardson Maturity Model. GraphQL schemas, resolvers, and the N+1 query problem with DataLoader. gRPC and Protocol Buffers serialization. Webhooks, Idempotency keys, API Gateway patterns.' },
  { topic: 'Parallel Computing & OpenMP/CUDA', text: 'High-Performance Computing: Flynn taxonomy (SIMD, MIMD). Shared-memory parallel programming with OpenMP: parallel for, race conditions, reduction clauses. GPU architecture: Thread warps, blocks, grids, Shared memory in CUDA. Amdahl Law vs Gustafson Law.' },
  { topic: 'Human-Computer Interaction & Accessibility', text: 'HCI & UX Engineering: Fitts Law, Hick Law. Nielsen 10 Usability Heuristics. Web Content Accessibility Guidelines (WCAG 2.1 AA standards): Semantic HTML, ARIA landmarks and live regions, Keyboard accessibility, Focus management, Color contrast ratios.' }
];

function buildPrompt(syllabusText, topicName, numQuestions = 5) {
  return `You are a Principal Computer Science Professor creating a high-quality online exam.
Analyze the following Computer Science syllabus / text excerpt and generate a balanced ${numQuestions}-question multiple choice test.

Syllabus Excerpt:
"""
${syllabusText}
"""

Requirements:
- Topic Focus: ${topicName || 'Computer Science Assessment'}
- Exactly ${numQuestions} questions.
- Each question must have 4 distinct options.
- Zero-indexed correctOptionIndex (0, 1, 2, or 3).
- Detailed technical explanation for why the correct option is right.
- "concept": Concise CS topic or concept name (e.g. "Deadlocks", "Binary Search", "TCP Handshake").
- "difficulty": "easy" | "medium" | "hard"

Respond ONLY with valid JSON conforming to this schema:
{
  "title": "String title",
  "description": "Short overview description",
  "topic": "${topicName || 'AI Generated'}",
  "timeLimitMinutes": 30,
  "markingScheme": { "correct": 4, "incorrect": -1 },
  "questions": [
    {
      "order": 1,
      "questionText": "Question string?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctOptionIndex": 0,
      "explanation": "Detailed explanation.",
      "concept": "Core Concept Name",
      "difficulty": "medium"
    }
  ]
}`;
}

function tryParseAndValidate(rawText) {
  try {
    const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const json = JSON.parse(cleaned);
    const validated = aiGeneratedTestSchema.parse(json);
    return { success: true, data: validated };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function runAIReliabilityBenchmark() {
  console.log('================================================================');
  console.log('     AlgoPrep - AI Syllabus Generator Schema Reliability Eval   ');
  console.log('================================================================\n');

  console.log(`[1/3] Loaded ${SYLLABI.length} diverse Computer Science syllabi.`);
  console.log('      Evaluating Pass@1 (First-try valid JSON) vs Pass@2 (After repair retry)...\n');

  let firstTryPassed = 0;
  let repairedPassed = 0;
  let totalFailed = 0;
  const failureReasons = [];

  const startTime = Date.now();

  for (let idx = 0; idx < SYLLABI.length; idx++) {
    const item = SYLLABI[idx];
    const testNum = idx + 1;
    const prompt = buildPrompt(item.text, item.topic, 5);

    process.stdout.write(`[${testNum}/${SYLLABI.length}] Testing: "${item.topic.slice(0, 36)}"... `);

    try {
      // 1. Initial Prompt Attempt
      const response1 = await generateGeminiContent({
        prompt,
        config: { responseMimeType: 'application/json' }
      });

      const parse1 = tryParseAndValidate(response1.text);

      if (parse1.success) {
        firstTryPassed++;
        console.log('PASS (Attempt 1)');
      } else {
        // First try failed schema validation
        console.log(`FAIL @ 1 -> Triggering Self-Healing Repair...`);
        failureReasons.push({ topic: item.topic, error: parse1.error.slice(0, 80) });

        // 2. Automated Repair Prompt
        const repairPrompt = `${prompt}\n\nYour previous JSON response failed validation with errors: ${parse1.error}. Please return strictly valid JSON conforming to the schema.`;
        const response2 = await generateGeminiContent({
          prompt: repairPrompt,
          config: { responseMimeType: 'application/json' }
        });

        const parse2 = tryParseAndValidate(response2.text);

        if (parse2.success) {
          repairedPassed++;
          console.log(`      -> REPAIRED & PASSED (Attempt 2) [Recovery OK]`);
        } else {
          totalFailed++;
          console.log(`      -> FAILED REPAIR: ${parse2.error.slice(0, 60)}`);
        }
      }
    } catch (apiErr) {
      console.log(`API Error: ${apiErr.message.slice(0, 60)}`);
      totalFailed++;
    }

    // Small pacing pause between calls to respect rate quotas
    await new Promise((r) => setTimeout(r, 600));
  }

  const totalTested = SYLLABI.length;
  const finalValidCount = firstTryPassed + repairedPassed;
  const initialPassRate = ((firstTryPassed / totalTested) * 100).toFixed(1);
  const finalPassRate = ((finalValidCount / totalTested) * 100).toFixed(1);
  const recoveryRate = failureReasons.length > 0 
    ? ((repairedPassed / failureReasons.length) * 100).toFixed(1)
    : '100';
  const durationMin = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log('\n================================================================');
  console.log('                 AI RELIABILITY EVALUATION RESULTS               ');
  console.log('================================================================');
  console.log(` Total Syllabi Evaluated  : ${totalTested} course modules`);
  console.log(` Evaluation Duration      : ${durationMin} minutes`);
  console.log(` Initial Valid (Pass@1)   : ${firstTryPassed}/${totalTested} (${initialPassRate}%)`);
  console.log(` Repaired via Retry       : ${repairedPassed}/${failureReasons.length} recovered (${recoveryRate}%)`);
  console.log(` Final Valid Rate         : ${finalValidCount}/${totalTested} (${finalPassRate}%)`);
  console.log(` Reliability Uplift       : +${(finalPassRate - initialPassRate).toFixed(1)} percentage points`);
  console.log('================================================================\n');

  console.log('>>> YOUR VERIFIED RESUME BULLETS:');
  console.log(`• "Engineered an automated self-healing schema retry pipeline with Zod, boosting LLM valid JSON output rate from ${initialPassRate}% to ${finalPassRate}% across ${totalTested} diverse syllabi."`);
  console.log(`• "Implemented self-correcting prompt retries for Gemini AI test generation, recovering ${recoveryRate}% of malformed schema responses to achieve a ${finalPassRate}% end-to-end reliability rate."`);
  console.log(`• "Raised structured AI generation reliability from ${initialPassRate}% to ${finalPassRate}% by feeding runtime Zod validation feedback into automated self-healing repair loops."`);
  console.log('================================================================\n');
}

runAIReliabilityBenchmark().catch((err) => {
  console.error('Eval failed:', err);
  process.exit(1);
});
