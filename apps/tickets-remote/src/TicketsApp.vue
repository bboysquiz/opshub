<script setup lang="ts">
type TicketsRuntimeProps = {
  userRole?: 'admin' | 'agent' | 'employee' | null;
  currentUserId?: string | null;
  currentUserEmail?: string | null;
  canUpdateTickets?: boolean;
  canDeleteTickets?: boolean;
  useNewTicketsTable?: boolean;
};

const props = withDefaults(defineProps<TicketsRuntimeProps>(), {
  userRole: null,
  currentUserId: null,
  currentUserEmail: null,
  canUpdateTickets: true,
  canDeleteTickets: true,
  useNewTicketsTable: false,
});

import TicketsPage from './features/tickets/ui/TicketsPage.vue';
</script>

<template>
  <TicketsPage
    :user-role="props.userRole"
    :current-user-id="props.currentUserId"
    :current-user-email="props.currentUserEmail"
    :can-update-tickets="props.canUpdateTickets"
    :can-delete-tickets="props.canDeleteTickets"
    :use-new-tickets-table="props.useNewTicketsTable"
  />
</template>
