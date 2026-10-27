// Transaction Ledger Frontend Controller

let accounts = [];
let currentAccount = null;
let currentTxType = 'credit';
let currentHistoryPage = 1;
let currentHistoryLimit = 10;
let currentHistoryTotalPages = 1;

// Currency Formatter
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

// Date Formatter
const formatDate = (isoString) => {
  if (!isoString) return '-';
  const d = new Date(isoString);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// Helper: Show Toast Notification
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div>
      <div style="font-weight: 600; margin-bottom: 2px;">${type === 'success' ? 'Success' : 'Error'}</div>
      <div style="font-size: 0.82rem; color: #cbd5e1;">${message}</div>
    </div>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Generate unique reference string
function generateRef(prefix = 'REF') {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timestamp = Date.now().toString().slice(-4);
  return `${prefix}-${timestamp}-${randomPart}`;
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupEventListeners();
  loadAccounts();
});

// Tab Navigation
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabButtons.forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.remove('active'));

      btn.classList.add('active');
      const targetPanel = document.getElementById(btn.getAttribute('data-tab'));
      if (targetPanel) {
        targetPanel.classList.add('active');
      }

      // If switching to history tab, refresh history if an account is selected
      if (btn.getAttribute('data-tab') === 'history-tab') {
        const filterSelect = document.getElementById('filter-account-id');
        if (filterSelect.value) {
          loadTransactionHistory();
        }
      }
    });
  });
}

// Setup Event Listeners
function setupEventListeners() {
  // Toggle credit / debit
  const creditBtn = document.getElementById('type-credit-btn');
  const debitBtn = document.getElementById('type-debit-btn');

  creditBtn.addEventListener('click', () => {
    creditBtn.classList.add('active');
    debitBtn.classList.remove('active');
    currentTxType = 'credit';
    updateSimulator();
  });

  debitBtn.addEventListener('click', () => {
    debitBtn.classList.add('active');
    creditBtn.classList.remove('active');
    currentTxType = 'debit';
    updateSimulator();
  });

  // Simulator inputs
  document.getElementById('tx-account-id').addEventListener('change', updateSimulator);
  document.getElementById('tx-amount').addEventListener('input', updateSimulator);

  // Generate Reference IDs
  document.getElementById('btn-generate-ref').addEventListener('click', () => {
    document.getElementById('tx-ref-id').value = generateRef('TX');
  });

  document.getElementById('btn-generate-transfer-ref').addEventListener('click', () => {
    document.getElementById('transfer-ref-id').value = generateRef('TRF');
  });

  // Transfer source change hint
  document.getElementById('transfer-source-id').addEventListener('change', (e) => {
    const acc = accounts.find((a) => a.id === e.target.value);
    const hint = document.getElementById('transfer-source-balance-hint');
    if (acc) {
      hint.textContent = `Available Balance: ${formatCurrency(acc.balance)}`;
    } else {
      hint.textContent = 'Available: $0.00';
    }
  });

  document.getElementById('transfer-dest-id').addEventListener('change', (e) => {
    const acc = accounts.find((a) => a.id === e.target.value);
    const hint = document.getElementById('transfer-dest-balance-hint');
    if (acc) {
      hint.textContent = `Current Balance: ${formatCurrency(acc.balance)}`;
    } else {
      hint.textContent = 'Current: $0.00';
    }
  });

  // Create Account Form
  document.getElementById('create-account-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('account-name');
    const name = nameInput.value.trim();

    if (!name) {
      showToast('Account name cannot be empty', 'error');
      return;
    }

    try {
      const res = await fetch('/api/v1/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Account successfully created for ${data.data.name}! Initial balance: $0.00`);
        nameInput.value = '';
        await loadAccounts();
      } else {
        showToast(data.error?.message || 'Failed to create account', 'error');
      }
    } catch (err) {
      showToast('Network error while creating account', 'error');
    }
  });

  // Execute Transaction Form
  document.getElementById('transaction-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const accountId = document.getElementById('tx-account-id').value;
    const amountVal = parseFloat(document.getElementById('tx-amount').value);
    const refId = document.getElementById('tx-ref-id').value.trim();
    const desc = document.getElementById('tx-description').value.trim();

    if (!accountId) {
      showToast('Please select an account', 'error');
      return;
    }

    if (isNaN(amountVal) || amountVal <= 0) {
      showToast('Transaction amount must be greater than 0', 'error');
      return;
    }

    if (!refId) {
      showToast('Reference ID is required', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/v1/accounts/${accountId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: currentTxType,
          amount: amountVal,
          reference_id: refId,
          description: desc || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(
          `Transaction completed! ${currentTxType.toUpperCase()} ${formatCurrency(amountVal)}. New Balance: ${formatCurrency(
            data.data.current_balance
          )}`
        );
        document.getElementById('tx-amount').value = '';
        document.getElementById('tx-ref-id').value = '';
        document.getElementById('tx-description').value = '';
        await loadAccounts();
        updateSimulator();
      } else {
        showToast(data.error?.message || 'Transaction rejected', 'error');
      }
    } catch (err) {
      showToast('Network error while processing transaction', 'error');
    }
  });

  // Execute Transfer Form
  document.getElementById('transfer-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const sourceId = document.getElementById('transfer-source-id').value;
    const destId = document.getElementById('transfer-dest-id').value;
    const amountVal = parseFloat(document.getElementById('transfer-amount').value);
    const refId = document.getElementById('transfer-ref-id').value.trim();
    const desc = document.getElementById('transfer-description').value.trim();

    if (!sourceId || !destId) {
      showToast('Select both source and destination accounts', 'error');
      return;
    }

    if (sourceId === destId) {
      showToast('Source and destination accounts must be different', 'error');
      return;
    }

    if (isNaN(amountVal) || amountVal <= 0) {
      showToast('Transfer amount must be greater than 0', 'error');
      return;
    }

    try {
      const res = await fetch('/api/v1/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_account_id: sourceId,
          destination_account_id: destId,
          amount: amountVal,
          reference_id: refId,
          description: desc || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Atomic transfer of ${formatCurrency(amountVal)} completed successfully!`);
        document.getElementById('transfer-amount').value = '';
        document.getElementById('transfer-ref-id').value = '';
        document.getElementById('transfer-description').value = '';
        await loadAccounts();
      } else {
        showToast(data.error?.message || 'Transfer failed', 'error');
      }
    } catch (err) {
      showToast('Network error while executing transfer', 'error');
    }
  });

  // History filters
  document.getElementById('filter-account-id').addEventListener('change', () => {
    currentHistoryPage = 1;
    loadTransactionHistory();
    auditAccountLedger();
  });

  document.getElementById('filter-type').addEventListener('change', () => {
    currentHistoryPage = 1;
    loadTransactionHistory();
  });

  document.getElementById('filter-limit').addEventListener('change', (e) => {
    currentHistoryLimit = parseInt(e.target.value, 10);
    currentHistoryPage = 1;
    loadTransactionHistory();
  });

  // Pagination buttons
  document.getElementById('btn-prev-page').addEventListener('click', () => {
    if (currentHistoryPage > 1) {
      currentHistoryPage--;
      loadTransactionHistory();
    }
  });

  document.getElementById('btn-next-page').addEventListener('click', () => {
    if (currentHistoryPage < currentHistoryTotalPages) {
      currentHistoryPage++;
      loadTransactionHistory();
    }
  });
}

// Load Accounts from API
async function loadAccounts() {
  try {
    const res = await fetch('/api/v1/accounts');
    const data = await res.json();

    if (res.ok && data.success) {
      accounts = data.data;
      renderAccountsTable(accounts);
      populateAccountDropdowns(accounts);
      updateOverviewStats(accounts);
    }
  } catch (err) {
    console.error('Error fetching accounts:', err);
  }
}

// Render Accounts Table
function renderAccountsTable(accs) {
  const tbody = document.getElementById('accounts-tbody');
  if (!accs || accs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted py-4">No accounts created yet. Register one above!</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = accs
    .map(
      (a) => `
    <tr>
      <td><span class="mono copyable" title="Click to copy" onclick="navigator.clipboard.writeText('${a.id}'); showToast('Copied account ID!')">${a.id.substring(0, 8)}...</span></td>
      <td><strong>${escapeHtml(a.name)}</strong></td>
      <td class="balance-cell">${formatCurrency(a.balance)}</td>
      <td class="mono" style="font-size: 0.8rem; color: var(--text-muted);">${formatDate(a.created_at)}</td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="auditSingleAccount('${a.id}')">
          Audit Ledger
        </button>
      </td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="quickSelectAccount('${a.id}')">
          Transact
        </button>
      </td>
    </tr>
  `
    )
    .join('');
}

// Populate Dropdown Selectors
function populateAccountDropdowns(accs) {
  const txSelect = document.getElementById('tx-account-id');
  const sourceSelect = document.getElementById('transfer-source-id');
  const destSelect = document.getElementById('transfer-dest-id');
  const filterSelect = document.getElementById('filter-account-id');

  const selectedTx = txSelect.value;
  const selectedSource = sourceSelect.value;
  const selectedDest = destSelect.value;
  const selectedFilter = filterSelect.value;

  const options = accs
    .map((a) => `<option value="${a.id}">${escapeHtml(a.name)} (${formatCurrency(a.balance)})</option>`)
    .join('');

  txSelect.innerHTML = `<option value="" disabled selected>Select an account</option>${options}`;
  sourceSelect.innerHTML = `<option value="" disabled selected>Select source account</option>${options}`;
  destSelect.innerHTML = `<option value="" disabled selected>Select destination account</option>${options}`;
  filterSelect.innerHTML = `<option value="" disabled selected>Select an account to view ledger</option>${options}`;

  if (selectedTx && accs.some((a) => a.id === selectedTx)) txSelect.value = selectedTx;
  if (selectedSource && accs.some((a) => a.id === selectedSource)) sourceSelect.value = selectedSource;
  if (selectedDest && accs.some((a) => a.id === selectedDest)) destSelect.value = selectedDest;
  if (selectedFilter && accs.some((a) => a.id === selectedFilter)) filterSelect.value = selectedFilter;
}

// Update Top Overview Stats
function updateOverviewStats(accs) {
  document.getElementById('stat-total-accounts').textContent = accs.length;
  const totalLiquidity = accs.reduce((sum, a) => sum + a.balance, 0);
  document.getElementById('stat-system-liquidity').textContent = formatCurrency(totalLiquidity);
}

// Live Simulator Update
function updateSimulator() {
  const accountId = document.getElementById('tx-account-id').value;
  const amountInput = parseFloat(document.getElementById('tx-amount').value) || 0;
  const acc = accounts.find((a) => a.id === accountId);

  const curBalanceEl = document.getElementById('sim-current-balance');
  const deltaEl = document.getElementById('sim-delta');
  const operatorEl = document.getElementById('sim-operator');
  const projBalanceEl = document.getElementById('sim-projected-balance');
  const noticeBox = document.getElementById('sim-rule-notice');
  const noticeText = document.getElementById('sim-rule-text');

  if (!acc) {
    curBalanceEl.textContent = '$0.00';
    deltaEl.textContent = '$0.00';
    projBalanceEl.textContent = '$0.00';
    noticeBox.className = 'rule-box';
    noticeText.textContent = 'Select an account and enter an amount to simulate ledger impact.';
    return;
  }

  const cur = acc.balance;
  curBalanceEl.textContent = formatCurrency(cur);
  deltaEl.textContent = formatCurrency(amountInput);

  if (currentTxType === 'credit') {
    operatorEl.textContent = '+';
    const projected = cur + amountInput;
    projBalanceEl.textContent = formatCurrency(projected);
    noticeBox.className = 'rule-box success';
    noticeText.textContent = `Credit will increase the verified account balance by ${formatCurrency(amountInput)}.`;
  } else {
    operatorEl.textContent = '-';
    const projected = cur - amountInput;
    projBalanceEl.textContent = formatCurrency(projected);

    if (amountInput > cur) {
      noticeBox.className = 'rule-box error';
      noticeText.textContent = `⚠️ Overdraft Rejected! Balance ($${cur.toFixed(2)}) is insufficient for this debit ($${amountInput.toFixed(2)}).`;
    } else {
      noticeBox.className = 'rule-box success';
      noticeText.textContent = `Valid debit. Balance will decrease to ${formatCurrency(projected)}.`;
    }
  }
}

// Quick Select Action from Accounts Table
window.quickSelectAccount = function (accountId) {
  document.getElementById('tab-nav-transactions').click();
  document.getElementById('tx-account-id').value = accountId;
  updateSimulator();
};

// Audit Action from Accounts Table
window.auditSingleAccount = function (accountId) {
  document.getElementById('tab-nav-history').click();
  document.getElementById('filter-account-id').value = accountId;
  currentHistoryPage = 1;
  loadTransactionHistory();
  auditAccountLedger();
};

// Load Transaction History
async function loadTransactionHistory() {
  const accountId = document.getElementById('filter-account-id').value;
  if (!accountId) return;

  const type = document.getElementById('filter-type').value;
  const tbody = document.getElementById('transactions-tbody');

  let url = `/api/v1/accounts/${accountId}/transactions?page=${currentHistoryPage}&limit=${currentHistoryLimit}`;
  if (type) {
    url += `&type=${type}`;
  }

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (res.ok && data.success) {
      const records = data.data.records;
      const meta = data.data.pagination;

      currentHistoryTotalPages = meta.total_pages;

      // Update pagination bar
      document.getElementById('pagination-info').textContent = `Showing ${records.length} of ${meta.total_records} records`;
      document.getElementById('current-page-indicator').textContent = `Page ${meta.current_page} of ${Math.max(1, meta.total_pages)}`;
      document.getElementById('btn-prev-page').disabled = meta.current_page <= 1;
      document.getElementById('btn-next-page').disabled = meta.current_page >= meta.total_pages;

      // Update total transactions count in stats
      document.getElementById('stat-total-transactions').textContent = meta.total_records;

      if (records.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center text-muted py-4">No transactions found for this account.</td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = records
        .map(
          (t) => `
        <tr>
          <td class="mono" style="font-size: 0.8rem; color: var(--text-muted);">${formatDate(t.created_at)}</td>
          <td><span class="mono" style="font-size: 0.78rem;">${t.id.substring(0, 8)}...</span></td>
          <td><strong class="mono" style="color: #cbd5e1;">${escapeHtml(t.reference_id)}</strong></td>
          <td>
            <span class="badge ${t.type === 'credit' ? 'badge-credit' : 'badge-debit'}">
              ${t.type === 'credit' ? '+ CREDIT' : '- DEBIT'}
            </span>
          </td>
          <td class="mono" style="font-weight: 700; color: ${t.type === 'credit' ? 'var(--emerald)' : 'var(--rose)'};">
            ${t.type === 'credit' ? '+' : '-'}${formatCurrency(t.amount)}
          </td>
          <td>${escapeHtml(t.description || '-')}</td>
        </tr>
      `
        )
        .join('');
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted py-4">${data.error?.message || 'Error loading history'}</td>
        </tr>
      `;
    }
  } catch (err) {
    console.error('Error fetching transaction history:', err);
  }
}

// Audit Account Ledger Math
async function auditAccountLedger() {
  const accountId = document.getElementById('filter-account-id').value;
  if (!accountId) return;

  const proofCard = document.getElementById('audit-proof-card');
  try {
    const res = await fetch(`/api/v1/accounts/${accountId}/integrity`);
    const data = await res.json();

    if (res.ok && data.success) {
      proofCard.style.display = 'block';
      const info = data.data;
      document.getElementById('audit-stored-val').textContent = formatCurrency(info.stored_balance);
      document.getElementById('audit-calculated-val').textContent = formatCurrency(info.calculated_balance);

      const variance = Math.abs(info.stored_balance - info.calculated_balance);
      const varEl = document.getElementById('audit-variance');
      varEl.textContent = formatCurrency(variance);

      const badge = document.getElementById('audit-status-badge');
      if (info.is_consistent) {
        badge.textContent = '100% Mathematical Match';
        badge.className = 'audit-badge';
        varEl.className = 'audit-val zero-var';
      } else {
        badge.textContent = 'Variance Detected';
        badge.className = 'audit-badge' + ' error';
      }
    }
  } catch (err) {
    console.error('Audit verification error:', err);
  }
}

// Utility: XSS escape
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
