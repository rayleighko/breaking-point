export const ENGINE_REGISTRY = {
  'queueing.v1': {
    label: 'Queueing System',
    status: 'stable',
    models: ['arrival', 'worker pool', 'bounded queue', 'timeout', 'retry'],
  },
  'cache.v1': {
    label: 'Cache',
    status: 'planned',
    models: ['TTL', 'hit/miss', 'stampede', 'jitter'],
  },
  'runtime.v1': {
    label: 'Runtime',
    status: 'planned',
    models: ['CPU', 'memory', 'GC', 'event loop/thread'],
  },
  'delivery.v1': {
    label: 'Delivery',
    status: 'planned',
    models: ['build', 'test', 'rollout', 'rollback'],
  },
} as const;
