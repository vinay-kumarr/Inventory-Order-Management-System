from datetime import datetime, timedelta, timezone

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import Date, func as sa_func
from sqlalchemy.orm import Session, joinedload

from .database import Base, engine, get_db
from .models import Customer, Order, Product
from .routers import auth, customers, orders, products
from .schemas import (
    DashboardResponse,
    LowStockProduct,
    RecentOrder,
    RevenuePoint,
)

LOW_STOCK_THRESHOLD = 10

app = FastAPI(
    title="Inventory & Order Management System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(customers.router)
app.include_router(orders.router)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {
        "message": "Inventory & Order Management System API",
        "version": "1.0.0",
    }


@app.get("/api/dashboard", response_model=DashboardResponse, tags=["dashboard"])
def dashboard(db: Session = Depends(get_db)):
    total_products = db.query(Product).count()
    total_customers = db.query(Customer).count()
    total_orders = db.query(Order).count()

    low_stock = (
        db.query(Product)
        .filter(Product.quantity < LOW_STOCK_THRESHOLD)
        .order_by(Product.quantity.asc())
        .all()
    )

    total_revenue = (
        db.query(sa_func.coalesce(sa_func.sum(Order.total_amount), 0.0))
        .filter(Order.status != "cancelled")
        .scalar()
        or 0.0
    )

    status_rows = (
        db.query(Order.status, sa_func.count(Order.id))
        .group_by(Order.status)
        .all()
    )
    orders_by_status = {s: c for s, c in status_rows}
    for s in ("confirmed", "shipped", "delivered", "cancelled"):
        orders_by_status.setdefault(s, 0)

    recent = (
        db.query(Order)
        .options(joinedload(Order.customer))
        .order_by(Order.created_at.desc(), Order.id.desc())
        .limit(5)
        .all()
    )
    recent_orders = [
        RecentOrder(
            id=o.id,
            customer_name=o.customer.full_name if o.customer else "",
            total_amount=float(o.total_amount),
            status=o.status,
            created_at=o.created_at,
        )
        for o in recent
    ]

    today = datetime.now(timezone.utc).date()
    start_date = today - timedelta(days=6)
    is_sqlite = engine.dialect.name == "sqlite"
    date_col = (
        sa_func.strftime("%Y-%m-%d", Order.created_at)
        if is_sqlite
        else sa_func.to_char(Order.created_at, "YYYY-MM-DD")
    )
    trend_rows = (
        db.query(
            date_col.label("day"),
            sa_func.coalesce(sa_func.sum(Order.total_amount), 0.0).label("revenue"),
        )
        .filter(Order.status != "cancelled")
        .filter(
            sa_func.date(Order.created_at) >= start_date
            if is_sqlite
            else Order.created_at >= start_date
        )
        .group_by("day")
        .all()
    )
    revenue_by_day = {row.day: float(row.revenue or 0.0) for row in trend_rows}
    revenue_trend = [
        RevenuePoint(
            date=(start_date + timedelta(days=i)).isoformat(),
            revenue=revenue_by_day.get(
                (start_date + timedelta(days=i)).isoformat(), 0.0
            ),
        )
        for i in range(7)
    ]

    return DashboardResponse(
        total_products=total_products,
        total_customers=total_customers,
        total_orders=total_orders,
        total_revenue=float(total_revenue),
        low_stock_products=[
            LowStockProduct(id=p.id, name=p.name, sku=p.sku, quantity=p.quantity)
            for p in low_stock
        ],
        orders_by_status=orders_by_status,
        recent_orders=recent_orders,
        revenue_trend=revenue_trend,
    )
