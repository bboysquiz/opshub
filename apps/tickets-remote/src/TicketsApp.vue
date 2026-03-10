<script setup lang="ts">
type TicketsRuntimeProps = {
  userRole?: 'admin' | 'agent' | 'employee' | null;
  canUpdateTickets?: boolean;
  canDeleteTickets?: boolean;
  useNewTicketsTable?: boolean;
};

const props = withDefaults(defineProps<TicketsRuntimeProps>(), {
  userRole: null,
  canUpdateTickets: true,
  canDeleteTickets: true,
  useNewTicketsTable: false,
});

import TicketsPage from './features/tickets/ui/TicketsPage.vue';
</script>

<template>
  <TicketsPage
    :user-role="props.userRole"
    :can-update-tickets="props.canUpdateTickets"
    :can-delete-tickets="props.canDeleteTickets"
    :use-new-tickets-table="props.useNewTicketsTable"
  />
</template>
