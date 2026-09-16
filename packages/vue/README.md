# @axag/vue

Vue bindings for AXAG. An action is registered while its component is mounted.

```bash
npm install @axag/vue
```

## Composable

```vue
<script setup lang="ts">
import { defineAction, useAxag } from '@axag/vue';

const addItem = defineAction({
  intent: 'cart.add_item',
  actionType: 'write',
  riskLevel: 'low',
  requiredParameters: [{ name: 'product_id', type: 'string' }],
});

const { el, attrs } = useAxag(addItem, { handler: ({ product_id }) => cart.add(product_id) });
</script>

<template>
  <button ref="el" v-bind="attrs">Add to cart</button>
</template>
```

`enabled` accepts a ref or getter, so an action can follow a permission check:

```ts
const { el, attrs } = useAxag(addItem, { enabled: () => user.canOrder });
```

## Directive

```ts
import { AxagPlugin } from '@axag/vue';
app.use(AxagPlugin);
```

```vue
<button v-axag="addItem">Add to cart</button>
<button v-axag="{ spec: addItem, handler: add }">Add to cart</button>
```

The directive sets the `axag-*` attributes on the element and registers the action, re-registering when the value changes and unregistering on unmount.
