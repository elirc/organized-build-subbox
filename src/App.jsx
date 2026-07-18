import { useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowDownUp,
  Ban,
  Boxes,
  CalendarClock,
  Check,
  ChevronRight,
  CreditCard,
  Gauge,
  Gift,
  Heart,
  Layers3,
  Mail,
  PackageCheck,
  PackagePlus,
  Pause,
  Play,
  RefreshCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Wand2,
  X,
} from 'lucide-react'
import {
  initialBox,
  initialEvents,
  initialRatings,
  initialShipments,
  initialSubscriber,
  inventorySeed,
  plans,
} from './data.js'

const tabs = [
  { id: 'portal', label: 'Portal', icon: Gift },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'preferences', label: 'Preferences', icon: Heart },
  { id: 'curator', label: 'Curator', icon: Wand2 },
  { id: 'fulfillment', label: 'Fulfillment', icon: Truck },
]

const money = (value) => `$${value.toFixed(2)}`
const findPlan = (id) => plans.find((plan) => plan.id === id)

function addEvent(setEvents, type, title, detail) {
  setEvents((events) => [
    {
      id: Date.now(),
      type,
      title,
      detail,
      time: 'Now',
    },
    ...events,
  ])
}

function App() {
  const [activeTab, setActiveTab] = useState('portal')
  const [subscriber, setSubscriber] = useState(initialSubscriber)
  const [events, setEvents] = useState(initialEvents)
  const [inventory, setInventory] = useState(inventorySeed)
  const [ratings, setRatings] = useState(initialRatings)
  const [box, setBox] = useState(initialBox)
  const [shipments, setShipments] = useState(initialShipments)
  const plan = findPlan(subscriber.planId)

  const scoredItems = useMemo(
    () => scoreInventory(inventory, subscriber.preferences, ratings),
    [inventory, subscriber.preferences, ratings],
  )

  const selectedItems = box.map((id) => inventory.find((item) => item.id === id)).filter(Boolean)
  const boxCost = selectedItems.reduce((sum, item) => sum + item.cost, 0)
  const boxRetail = selectedItems.reduce((sum, item) => sum + item.retail, 0)
  const matchRate = selectedItems.length
    ? Math.round(
        selectedItems.reduce((sum, item) => sum + scoreItem(item, subscriber.preferences, ratings), 0) /
          selectedItems.length,
      )
    : 0

  const appState = {
    subscriber,
    setSubscriber,
    events,
    setEvents,
    inventory,
    setInventory,
    ratings,
    setRatings,
    box,
    setBox,
    shipments,
    setShipments,
    plan,
    scoredItems,
    selectedItems,
    boxCost,
    boxRetail,
    matchRate,
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Boxes size={22} />
          </div>
          <div>
            <strong>ParcelPilot</strong>
            <span>Subscription ops</span>
          </div>
        </div>

        <nav className="nav-tabs" aria-label="Main sections">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                className={activeTab === tab.id ? 'active' : ''}
                onClick={() => setActiveTab(tab.id)}
                type="button"
                title={tab.label}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="cycle-card">
          <span>Next billing batch</span>
          <strong>{subscriber.nextInvoice}</strong>
          <p>{subscriber.status === 'active' ? '1,842 active subscribers queued' : 'Subscriber is off-cycle'}</p>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">Monthly box platform</p>
            <h1>{sectionTitle(activeTab)}</h1>
          </div>
          <div className="account-chip">
            <span className={`dot ${subscriber.paymentHealth}`} />
            {subscriber.name}
          </div>
        </header>

        <Metrics subscriber={subscriber} plan={plan} matchRate={matchRate} shipments={shipments} />

        {activeTab === 'portal' && <Portal {...appState} />}
        {activeTab === 'billing' && <Billing {...appState} />}
        {activeTab === 'preferences' && <Preferences {...appState} />}
        {activeTab === 'curator' && <Curator {...appState} />}
        {activeTab === 'fulfillment' && <Fulfillment {...appState} />}
      </main>
    </div>
  )
}

function sectionTitle(tab) {
  return {
    portal: 'Subscriber portal',
    billing: 'Recurring billing lifecycle',
    preferences: 'Preference engine',
    curator: 'Curator dashboard',
    fulfillment: 'Fulfillment pipeline',
  }[tab]
}

function Metrics({ subscriber, plan, matchRate, shipments }) {
  const blocked = shipments.filter((shipment) => shipment.status === 'Exception').length
  const metrics = [
    { label: 'Plan MRR', value: money(plan.price), icon: Activity, tone: 'green' },
    { label: 'Subscription', value: subscriber.status, icon: ShieldCheck, tone: 'blue' },
    { label: 'Match score', value: `${matchRate}%`, icon: Sparkles, tone: 'gold' },
    { label: 'Exceptions', value: blocked, icon: AlertTriangle, tone: 'red' },
  ]

  return (
    <section className="metric-grid">
      {metrics.map((metric) => {
        const Icon = metric.icon
        return (
          <div className="metric" key={metric.label}>
            <div className={`icon-badge ${metric.tone}`}>
              <Icon size={18} />
            </div>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        )
      })}
    </section>
  )
}

function Portal({ subscriber, setSubscriber, setEvents, plan, scoredItems, box, setBox, selectedItems }) {
  const swapTarget = selectedItems[selectedItems.length - 1]
  const recommendedSwap = scoredItems.find((item) => !box.includes(item.id))

  const setStatus = (status, detail) => {
    setSubscriber((current) => ({
      ...current,
      status,
      pausedUntil: status === 'paused' ? '2026-07-01' : null,
    }))
    addEvent(setEvents, 'portal', `Subscription ${status}`, detail)
  }

  const toggleSkip = () => {
    setSubscriber((current) => ({ ...current, skipNext: !current.skipNext }))
    addEvent(
      setEvents,
      'billing',
      subscriber.skipNext ? 'Skip removed' : 'June box skipped',
      subscriber.skipNext
        ? 'Shipment and invoice returned to the June batch.'
        : 'Shipment suppressed and next invoice moved to Jul 1.',
    )
  }

  const swapItem = () => {
    if (!swapTarget || !recommendedSwap) return
    setBox((ids) => ids.map((id) => (id === swapTarget.id ? recommendedSwap.id : id)))
    addEvent(
      setEvents,
      'curation',
      'Subscriber swapped an item',
      `${swapTarget.name} replaced with ${recommendedSwap.name}; inventory reservation updated.`,
    )
  }

  return (
    <section className="two-column">
      <div className="panel wide">
        <PanelTitle icon={Gift} title="Current box" action={`${plan.name} / ${plan.items} items`} />
        <div className="box-preview">
          {selectedItems.map((item) => (
            <ItemTile item={item} key={item.id} />
          ))}
        </div>
        <div className="action-row">
          <button type="button" onClick={toggleSkip}>
            <CalendarClock size={17} />
            {subscriber.skipNext ? 'Unskip' : 'Skip June'}
          </button>
          <button type="button" onClick={swapItem}>
            <ArrowDownUp size={17} />
            Swap lowest match
          </button>
          {subscriber.status === 'paused' ? (
            <button type="button" onClick={() => setStatus('active', 'Billing resumes on the next monthly anchor.')}>
              <Play size={17} />
              Resume
            </button>
          ) : (
            <button type="button" onClick={() => setStatus('paused', 'Upcoming invoices are paused until Jul 1.')}>
              <Pause size={17} />
              Pause
            </button>
          )}
          <button type="button" className="danger" onClick={() => setStatus('canceled', 'Cancellation at period end queued.')}>
            <Ban size={17} />
            Cancel
          </button>
        </div>
      </div>

      <div className="panel">
        <PanelTitle icon={Settings2} title="Subscription state" />
        <div className="state-list">
          <StateRow label="Status" value={subscriber.status} />
          <StateRow label="Next invoice" value={subscriber.skipNext ? '2026-07-01' : subscriber.nextInvoice} />
          <StateRow label="Card" value={subscriber.card} />
          <StateRow label="Payment health" value={subscriber.paymentHealth} />
        </div>
        <div className="notice">
          <Sparkles size={18} />
          <p>{recommendedSwap ? `${recommendedSwap.name} is the best available swap for Maya.` : 'The current box is fully optimized.'}</p>
        </div>
      </div>
    </section>
  )
}

function Billing({ subscriber, setSubscriber, setEvents, plan, events }) {
  const changePlan = (nextPlanId) => {
    const nextPlan = findPlan(nextPlanId)
    const delta = nextPlan.price - plan.price
    const proration = Math.round(delta * 0.42 * 100) / 100
    setSubscriber((current) => ({
      ...current,
      planId: nextPlanId,
      balance: current.balance + proration,
    }))
    addEvent(
      setEvents,
      'billing',
      `${delta > 0 ? 'Upgrade' : 'Downgrade'} to ${nextPlan.name}`,
      `${money(Math.abs(proration))} ${delta > 0 ? 'proration charge' : 'credit'} applied for the remaining cycle.`,
    )
  }

  const failPayment = () => {
    setSubscriber((current) => ({
      ...current,
      paymentHealth: 'past_due',
      retryAttempt: 1,
      dunningStage: 'soft email',
      balance: current.balance + plan.price,
    }))
    addEvent(setEvents, 'billing', 'Invoice payment failed', 'Retry 1 scheduled in 3 days and dunning email queued.')
  }

  const retryPayment = () => {
    setSubscriber((current) => {
      const recovered = current.retryAttempt >= 2
      return {
        ...current,
        paymentHealth: recovered ? 'healthy' : 'past_due',
        retryAttempt: recovered ? 0 : current.retryAttempt + 1,
        dunningStage: recovered ? 'none' : 'firm email',
        balance: recovered ? 0 : current.balance,
      }
    })
    addEvent(
      setEvents,
      'billing',
      subscriber.retryAttempt >= 2 ? 'Payment recovered' : 'Retry attempted',
      subscriber.retryAttempt >= 2
        ? 'Invoice closed and subscription returned to active collection.'
        : 'Charge failed again; firmer dunning sequence scheduled.',
    )
  }

  return (
    <section className="two-column">
      <div className="panel wide">
        <PanelTitle icon={CreditCard} title="Plan controls" action="Stripe-style simulation" />
        <div className="plan-grid">
          {plans.map((candidate) => (
            <button
              className={`plan-card ${candidate.id === subscriber.planId ? 'selected' : ''}`}
              key={candidate.id}
              onClick={() => changePlan(candidate.id)}
              type="button"
            >
              <span>{candidate.name}</span>
              <strong>{money(candidate.price)}</strong>
              <small>{candidate.value}</small>
            </button>
          ))}
        </div>
        <div className="action-row">
          <button type="button" onClick={failPayment}>
            <AlertTriangle size={17} />
            Fail invoice
          </button>
          <button type="button" onClick={retryPayment}>
            <RefreshCcw size={17} />
            Retry charge
          </button>
          <button
            type="button"
            onClick={() => addEvent(setEvents, 'billing', 'Dunning email sent', 'Personalized payment update email logged.')}
          >
            <Mail size={17} />
            Send dunning
          </button>
        </div>
      </div>
      <div className="panel">
        <PanelTitle icon={Layers3} title="Invoice ledger" />
        <div className="state-list">
          <StateRow label="Open balance" value={money(subscriber.balance)} />
          <StateRow label="Retry attempt" value={subscriber.retryAttempt} />
          <StateRow label="Dunning stage" value={subscriber.dunningStage} />
          <StateRow label="Billing anchor" value={`Day ${subscriber.renewalDay}`} />
        </div>
      </div>
      <div className="panel full">
        <PanelTitle icon={Activity} title="Lifecycle events" />
        <Timeline events={events} />
      </div>
    </section>
  )
}

function Preferences({ subscriber, setSubscriber, inventory, ratings, setRatings, scoredItems, setEvents }) {
  const updatePreference = (key, value) => {
    setSubscriber((current) => ({
      ...current,
      preferences: { ...current.preferences, [key]: value },
    }))
  }

  const rateItem = (itemId, rating) => {
    setRatings((current) => {
      const existing = current.find((entry) => entry.itemId === itemId)
      if (existing) {
        return current.map((entry) => (entry.itemId === itemId ? { ...entry, rating } : entry))
      }
      return [...current, { itemId, rating, note: 'Rated from portal' }]
    })
    addEvent(setEvents, 'curation', 'Rating captured', 'Future recommendations recalculated from subscriber feedback.')
  }

  return (
    <section className="two-column">
      <div className="panel wide">
        <PanelTitle icon={Heart} title="Preference quiz" action={subscriber.preferences.vibe} />
        <div className="quiz-grid">
          <Segment label="Skin" value={subscriber.preferences.skin} options={['Sensitive', 'Dry', 'Balanced']} onChange={(value) => updatePreference('skin', value)} />
          <Segment label="Scent" value={subscriber.preferences.scent} options={['Citrus', 'Woody', 'Unscented']} onChange={(value) => updatePreference('scent', value)} />
          <Segment label="Snacks" value={subscriber.preferences.snacks} options={['Low sugar', 'Savory', 'No snacks']} onChange={(value) => updatePreference('snacks', value)} />
          <Segment label="Home" value={subscriber.preferences.home} options={['Minimal', 'Colorful', 'Cozy']} onChange={(value) => updatePreference('home', value)} />
        </div>
        <label className="slider-field">
          <span>Surprise tolerance</span>
          <strong>{subscriber.preferences.surprise}%</strong>
          <input
            max="100"
            min="0"
            onChange={(event) => updatePreference('surprise', Number(event.target.value))}
            type="range"
            value={subscriber.preferences.surprise}
          />
        </label>
      </div>

      <div className="panel">
        <PanelTitle icon={Sparkles} title="Recommendation queue" />
        <div className="recommend-list">
          {scoredItems.slice(0, 5).map((item) => (
            <div className="recommend-row" key={item.id}>
              <span>{item.name}</span>
              <strong>{item.score}%</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="panel full">
        <PanelTitle icon={Star} title="Past item ratings" />
        <div className="rating-grid">
          {inventory.slice(0, 6).map((item) => {
            const current = ratings.find((entry) => entry.itemId === item.id)?.rating || 0
            return (
              <div className="rating-row" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.category}</span>
                </div>
                <div className="stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      className={star <= current ? 'filled' : ''}
                      key={star}
                      onClick={() => rateItem(item.id, star)}
                      title={`${star} stars`}
                      type="button"
                    >
                      <Star size={16} />
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function Curator({ inventory, setInventory, box, setBox, plan, selectedItems, boxCost, boxRetail, matchRate, setEvents }) {
  const addItem = (id) => {
    if (box.includes(id) || box.length >= plan.items) return
    setBox((current) => [...current, id])
    addEvent(setEvents, 'curation', 'Item added to monthly box', 'Box margin and match score recalculated.')
  }

  const removeItem = (id) => {
    setBox((current) => current.filter((itemId) => itemId !== id))
    addEvent(setEvents, 'curation', 'Item removed from box', 'Inventory reservation released.')
  }

  const reserveInventory = () => {
    setInventory((current) =>
      current.map((item) => (box.includes(item.id) ? { ...item, stock: Math.max(0, item.stock - 1842) } : item)),
    )
    addEvent(setEvents, 'fulfillment', 'Inventory reserved', 'Active subscriber count reserved against selected SKU pool.')
  }

  return (
    <section className="two-column">
      <div className="panel wide">
        <PanelTitle icon={Wand2} title="June box assembly" action={`${box.length}/${plan.items} selected`} />
        <div className="box-preview">
          {selectedItems.map((item) => (
            <ItemTile item={item} key={item.id} onRemove={() => removeItem(item.id)} />
          ))}
        </div>
        <div className="action-row">
          <button type="button" onClick={reserveInventory}>
            <PackageCheck size={17} />
            Reserve SKUs
          </button>
        </div>
      </div>

      <div className="panel">
        <PanelTitle icon={Gauge} title="Box economics" />
        <div className="state-list">
          <StateRow label="Cost" value={money(boxCost)} />
          <StateRow label="Retail value" value={money(boxRetail)} />
          <StateRow label="Gross margin" value={`${Math.round(((plan.price - boxCost) / plan.price) * 100)}%`} />
          <StateRow label="Match score" value={`${matchRate}%`} />
        </div>
      </div>

      <div className="panel full">
        <PanelTitle icon={PackagePlus} title="Inventory catalog" />
        <div className="inventory-table">
          {inventory.map((item) => (
            <div className="inventory-row" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <span>{item.category} / {item.segment}</span>
              </div>
              <span>{item.stock} units</span>
              <span>{money(item.cost)} cost</span>
              <button disabled={box.includes(item.id) || box.length >= plan.items} onClick={() => addItem(item.id)} type="button">
                <ChevronRight size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Fulfillment({ subscriber, shipments, setShipments, selectedItems, setEvents }) {
  const generateBatch = () => {
    const nextShipment = {
      id: `shp_${Math.floor(Math.random() * 9000) + 1000}`,
      subscriber: subscriber.name,
      plan: findPlan(subscriber.planId).name,
      status: subscriber.skipNext || subscriber.status !== 'active' ? 'Suppressed' : 'Generated',
      destination: 'Portland, OR',
      items: selectedItems.length,
      risk: subscriber.paymentHealth === 'healthy' ? 'None' : 'Payment retry',
    }
    setShipments((current) => [nextShipment, ...current])
    addEvent(setEvents, 'fulfillment', 'Monthly shipment batch generated', 'Calendar job evaluated subscriber status, skips, and payment health.')
  }

  const advanceShipment = (id) => {
    const nextStatus = {
      Generated: 'Picking',
      Picking: 'Packed',
      Packed: 'Shipped',
      Exception: 'Picking',
      Suppressed: 'Suppressed',
      Shipped: 'Shipped',
    }
    setShipments((current) =>
      current.map((shipment) => (shipment.id === id ? { ...shipment, status: nextStatus[shipment.status] } : shipment)),
    )
  }

  return (
    <section className="two-column">
      <div className="panel wide">
        <PanelTitle icon={Truck} title="Batch operations" action="Calendar driven" />
        <div className="pipeline">
          {['Generated', 'Picking', 'Packed', 'Shipped'].map((stage) => (
            <div className="pipeline-step" key={stage}>
              <strong>{shipments.filter((shipment) => shipment.status === stage).length}</strong>
              <span>{stage}</span>
            </div>
          ))}
        </div>
        <div className="action-row">
          <button type="button" onClick={generateBatch}>
            <CalendarClock size={17} />
            Run month start job
          </button>
        </div>
      </div>

      <div className="panel">
        <PanelTitle icon={AlertTriangle} title="Exception queue" />
        {shipments
          .filter((shipment) => shipment.status === 'Exception' || shipment.risk !== 'None')
          .map((shipment) => (
            <div className="exception-row" key={shipment.id}>
              <strong>{shipment.subscriber}</strong>
              <span>{shipment.risk}</span>
            </div>
          ))}
      </div>

      <div className="panel full">
        <PanelTitle icon={PackageCheck} title="Shipment workbench" />
        <div className="shipment-table">
          {shipments.map((shipment) => (
            <div className="shipment-row" key={shipment.id}>
              <span>{shipment.id}</span>
              <strong>{shipment.subscriber}</strong>
              <span>{shipment.destination}</span>
              <StatusPill value={shipment.status} />
              <button onClick={() => advanceShipment(shipment.id)} type="button">
                <Check size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PanelTitle({ icon: Icon, title, action }) {
  return (
    <div className="panel-title">
      <div>
        <Icon size={18} />
        <h2>{title}</h2>
      </div>
      {action && <span>{action}</span>}
    </div>
  )
}

function StateRow({ label, value }) {
  return (
    <div className="state-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function ItemTile({ item, onRemove }) {
  return (
    <article className="item-tile">
      <div>
        <span>{item.category}</span>
        <strong>{item.name}</strong>
      </div>
      <small>{item.tags.slice(0, 2).join(' / ')}</small>
      {onRemove && (
        <button onClick={onRemove} title="Remove item" type="button">
          <X size={15} />
        </button>
      )}
    </article>
  )
}

function Segment({ label, value, options, onChange }) {
  return (
    <div className="segment-field">
      <span>{label}</span>
      <div>
        {options.map((option) => (
          <button className={value === option ? 'selected' : ''} key={option} onClick={() => onChange(option)} type="button">
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

function Timeline({ events }) {
  return (
    <div className="timeline">
      {events.map((event) => (
        <article className="timeline-event" key={event.id}>
          <span>{event.time}</span>
          <div>
            <strong>{event.title}</strong>
            <p>{event.detail}</p>
          </div>
        </article>
      ))}
    </div>
  )
}

function StatusPill({ value }) {
  return <span className={`status ${value.toLowerCase()}`}>{value}</span>
}

function scoreInventory(inventory, preferences, ratings) {
  return inventory
    .map((item) => ({
      ...item,
      score: scoreItem(item, preferences, ratings),
    }))
    .sort((a, b) => b.score - a.score)
}

function scoreItem(item, preferences, ratings) {
  const positiveSignals = [preferences.vibe, preferences.skin, preferences.scent, preferences.snacks, preferences.home]
  const matches = item.tags.filter((tag) => positiveSignals.includes(tag)).length
  const blocked = item.tags.some((tag) => preferences.excluded.includes(tag))
  const rating = ratings.find((entry) => entry.itemId === item.id)?.rating || 3
  const novelty = item.segment === 'Premium' ? preferences.surprise / 10 : 4
  return Math.max(12, Math.min(99, Math.round(38 + matches * 13 + rating * 5 + novelty - (blocked ? 35 : 0))))
}

export default App
