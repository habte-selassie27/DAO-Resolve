import { createRouter, createWebHistory } from "vue-router";
import Overview from "./screens/Overview.vue";
import Rules from "./screens/Rules.vue";
import RuleDetail from "./screens/RuleDetail.vue";
import Proposals from "./screens/Proposals.vue";
import ProposalDetail from "./screens/ProposalDetail.vue";
import Disputes from "./screens/Disputes.vue";
import DisputeDetail from "./screens/DisputeDetail.vue";
import Admin from "./screens/Admin.vue";
import HowItWorks from "./screens/HowItWorks.vue";

const routes = [
  { path: "/", name: "overview", component: Overview, meta: { title: "Overview" } },
  { path: "/rules", name: "rules", component: Rules, meta: { title: "Rules" } },
  { path: "/rules/:ruleId", name: "rule", component: RuleDetail, meta: { title: "Rule" } },
  { path: "/proposals", name: "proposals", component: Proposals, meta: { title: "Proposals" } },
  { path: "/proposals/:proposalId", name: "proposal", component: ProposalDetail, meta: { title: "Proposal" } },
  { path: "/disputes", name: "disputes", component: Disputes, meta: { title: "Disputes" } },
  { path: "/disputes/:disputeId", name: "dispute", component: DisputeDetail, meta: { title: "Dispute" } },
  { path: "/admin", name: "admin", component: Admin, meta: { title: "Admin" } },
  { path: "/how-it-works", name: "how", component: HowItWorks, meta: { title: "How it works" } },
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

router.afterEach((to) => {
  document.title = `${to.meta.title || "DAOResolve"} · DAOResolve`;
});
