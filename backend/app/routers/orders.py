from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from ..database import get_db
from ..models import Customer, Order, OrderItem, Product
from ..schemas import OrderCreate, OrderListResponse, OrderResponse

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == payload.customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with id {payload.customer_id} not found",
        )

    # Aggregate quantities per product (defends against duplicate line items)
    requested: dict[int, int] = {}
    for item in payload.items:
        requested[item.product_id] = requested.get(item.product_id, 0) + item.quantity

    product_ids = list(requested.keys())
    products = db.query(Product).filter(Product.id.in_(product_ids)).all()
    products_by_id = {p.id: p for p in products}

    missing = [pid for pid in product_ids if pid not in products_by_id]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Products not found: {missing}",
        )

    # Validate inventory
    insufficient = []
    for pid, qty in requested.items():
        product = products_by_id[pid]
        if product.quantity < qty:
            insufficient.append({
                "product_id": pid,
                "product_name": product.name,
                "sku": product.sku,
                "requested": qty,
                "available": product.quantity,
            })
    if insufficient:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Insufficient stock for one or more products",
                "items": insufficient,
            },
        )

    try:
        order = Order(
            customer_id=payload.customer_id,
            total_amount=0,
            status="confirmed",
        )
        db.add(order)
        db.flush()  # obtain order.id

        total = 0.0
        for item in payload.items:
            product = products_by_id[item.product_id]
            unit_price = float(product.price)
            subtotal = unit_price * item.quantity
            total += subtotal

            db.add(OrderItem(
                order_id=order.id,
                product_id=product.id,
                quantity=item.quantity,
                unit_price=unit_price,
                subtotal=subtotal,
            ))
            product.quantity -= item.quantity

        order.total_amount = total
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(order)
    order = (
        db.query(Order)
        .options(joinedload(Order.customer), joinedload(Order.items).joinedload(OrderItem.product))
        .filter(Order.id == order.id)
        .first()
    )
    return order


@router.get("/", response_model=List[OrderListResponse])
def list_orders(db: Session = Depends(get_db)):
    orders = (
        db.query(Order)
        .options(joinedload(Order.customer), joinedload(Order.items))
        .order_by(Order.id.desc())
        .all()
    )
    return [
        OrderListResponse(
            id=o.id,
            customer_id=o.customer_id,
            customer_name=o.customer.full_name if o.customer else "",
            total_amount=o.total_amount,
            status=o.status,
            item_count=len(o.items),
            created_at=o.created_at,
        )
        for o in orders
    ]


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = (
        db.query(Order)
        .options(joinedload(Order.customer), joinedload(Order.items).joinedload(OrderItem.product))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with id {order_id} not found",
        )
    return order


@router.delete("/{order_id}", response_model=OrderResponse)
def cancel_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with id {order_id} not found",
        )

    order.status = "cancelled"
    db.commit()

    order = (
        db.query(Order)
        .options(joinedload(Order.customer), joinedload(Order.items).joinedload(OrderItem.product))
        .filter(Order.id == order_id)
        .first()
    )
    return order
