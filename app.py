import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from datetime import datetime
import json
import re

st.set_page_config(
    page_title="Business & Rental Income Tracker Pro",
    page_icon="🏦",
    layout="wide",
    initial_sidebar_state="expanded"
)

if 'transactions' not in st.session_state:
    st.session_state.transactions = pd.DataFrame()
if 'monthly_history' not in st.session_state:
    st.session_state.monthly_history = {}
if 'properties' not in st.session_state:
    st.session_state.properties = [
        {'id': '2111_9th', 'name': '2111 9th Street', 'value': 353000},
        {'id': '2024_50th', 'name': '2024 50th Street', 'value': 274500},
        {'id': '1112_36th', 'name': '1112 36th St W', 'value': 432000},
        {'id': '5th_st_e', 'name': '5th ST E', 'value': 305000},
        {'id': '37th_ave_e', 'name': '37th Ave E', 'value': 281500},
        {'id': '61st_ave_ter', 'name': '61st Ave Ter E', 'value': 335000},
        {'id': '59th_ave_e', 'name': '59th Ave E', 'value': 319000},
        {'id': '2nd_st_w', 'name': '2nd St W', 'value': 350000},
        {'id': 'harbor_st', 'name': 'Harbor St', 'value': 75000},
        {'id': 'las_palmas', 'name': 'Las Palmas', 'value': 250000},
        {'id': 'primary_home', 'name': '4156 Cascade Falls (Primary)', 'value': 405000},
        {'id': 'summer_home', 'name': '91 River Run (Summer)', 'value': 380000}
    ]

AUTO_CATEGORIES = {
    'capital_hvac': [r'air.*condition', r'hvac', r'heating.*system', r'furnace', r'heat.*pump', r'ac.*unit', r'central.*air'],
    'capital_roofing': [r'roof', r'shingle', r'gutter', r'roof.*repair', r'roof.*replacement'],
    'capital_generator': [r'generator', r'backup.*power', r'standby.*generator'],
    'capital_appliances': [r'refrigerator', r'washer', r'dryer', r'dishwasher', r'stove', r'oven', r'microwave'],
    'capital_flooring': [r'flooring', r'carpet', r'hardwood', r'tile', r'laminate', r'vinyl'],
    'capital_windows': [r'window', r'door', r'sliding.*door', r'french.*door'],
    'capital_electrical': [r'electrical.*panel', r'rewiring', r'electrical.*upgrade', r'circuit.*breaker'],
    'capital_plumbing': [r'water.*heater', r'plumbing.*upgrade', r'pipe.*replacement', r'sewer.*line'],
    'rental_income': [r'rent', r'tenant', r'property.*income', r'rental.*payment'],
    'business_income': [r'invoice', r'payment.*received', r'client.*payment', r'consulting', r'service.*fee'],
    'utilities': [r'electric', r'gas.*company', r'water.*bill', r'internet', r'phone', r'cable', r'vyve', r'frontier', r'netflix', r'streaming'],
    'insurance': [r'insurance', r'premium', r'policy.*payment', r'coverage'],
    'property_maintenance': [r'maintenance', r'repair', r'landscaping', r'cleaning', r'pest.*control', r'small.*repair', r'handyman', r'lawn.*care'],
    'property_expenses': [r'property.*tax', r'hoa', r'property.*management'],
    'business_expenses': [r'office.*supplies', r'software', r'subscription', r'travel', r'meeting', r'equipment', r'computer', r'professional.*services'],
    'personal_expenses': [r'grocery', r'restaurant', r'gas.*station', r'retail', r'shopping', r'amazon', r'target', r'walmart', r'costco']
}

def auto_categorize_transaction(description):
    desc_lower = description.lower()
    for category, patterns in AUTO_CATEGORIES.items():
        for pattern in patterns:
            if re.search(pattern, desc_lower):
                return category
    return 'uncategorized'

def process_csv_file(uploaded_file, account_type):
    try:
        try:
            df = pd.read_csv(uploaded_file)
        except UnicodeDecodeError:
            uploaded_file.seek(0)
            df = pd.read_csv(uploaded_file, encoding='latin-1')
        except:
            uploaded_file.seek(0)
            df = pd.read_csv(uploaded_file, encoding='cp1252')
        
        st.sidebar.write(f"**{account_type.upper()} Columns Found:**")
        st.sidebar.write(df.columns.tolist())
        
        df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_').str.replace('/', '_').str.replace('-', '_')
        columns = df.columns.tolist()
        
        date_candidates = [
            'date', 'transaction_date', 'trans_date', 'posting_date', 'post_date', 
            'effective_date', 'process_date', 'transaction_post_date', 'details'
        ]
        date_col = None
        for candidate in date_candidates:
            if candidate in columns:
                date_col = candidate
                break
        if not date_col:
            for col in columns:
                if 'date' in col.lower():
                    date_col = col
                    break
        if not date_col:
            date_col = columns[0]
        
        desc_candidates = [
            'description', 'memo', 'payee', 'details', 'transaction_description',
            'desc', 'merchant', 'reference', 'transaction_details', 'check_or_slip'
        ]
        desc_col = None
        for candidate in desc_candidates:
            if candidate in columns:
                desc_col = candidate
                break
        if not desc_col:
            for col in columns:
                if any(word in col.lower() for word in ['desc', 'memo', 'payee', 'merchant']):
                    desc_col = col
                    break
        if not desc_col:
            desc_col = columns[1] if len(columns) > 1 else columns[0]
        
        amount_candidates = ['amount', 'transaction_amount', 'trans_amount', 'balance_amount']
        debit_col = None
        credit_col = None
        amount_col = None
        
        for candidate in amount_candidates:
            if candidate in columns:
                amount_col = candidate
                break
        
        if not amount_col:
            for candidate in ['debit', 'withdrawal', 'withdrawals']:
                if candidate in columns:
                    debit_col = candidate
                    break
            for candidate in ['credit', 'deposit', 'deposits']:
                if candidate in columns:
                    credit_col = candidate
                    break
        
        if not amount_col and not debit_col and not credit_col:
            for col in columns:
                if 'amount' in col.lower():
                    amount_col = col
                    break
            if not amount_col:
                amount_col = columns[-2] if len(columns) > 1 else columns[-1]
        
        st.sidebar.write(f"**Using:** Date: {date_col}, Description: {desc_col}")
        if amount_col:
            st.sidebar.write(f"Amount: {amount_col}")
        else:
            st.sidebar.write(f"Debit: {debit_col}, Credit: {credit_col}")
        
        processed_data = {
            'date': pd.to_datetime(df[date_col], errors='coerce'),
            'account': account_type,
            'description': df[desc_col].astype(str),
        }
        
        if amount_col:
            processed_data['amount'] = pd.to_numeric(df[amount_col], errors='coerce')
        else:
            debit_amounts = pd.to_numeric(df[debit_col], errors='coerce').fillna(0) if debit_col else 0
            credit_amounts = pd.to_numeric(df[credit_col], errors='coerce').fillna(0) if credit_col else 0
            processed_data['amount'] = credit_amounts - debit_amounts
        
        processed_df = pd.DataFrame(processed_data)
        
        if account_type in ['chase', 'expenses']:
            processed_df['amount'] = processed_df['amount'].apply(lambda x: -abs(x) if x > 0 else x)
        
        processed_df['category'] = processed_df['description'].apply(auto_categorize_transaction)
        processed_df['is_capital'] = processed_df['category'].str.startswith('capital_')
        processed_df['property'] = ''
        processed_df['notes'] = ''
        
        processed_df = processed_df.dropna(subset=['date'])
        processed_df = processed_df[processed_df['amount'] != 0]
        
        if not processed_df.empty:
            st.sidebar.write(f"**Sample processed data:**")
            sample = processed_df[['date', 'description', 'amount']].head(3)
            st.sidebar.dataframe(sample)
        
        return processed_df
        
    except Exception as e:
        st.sidebar.error(f"Error processing {account_type} CSV: {str(e)}")
        return pd.DataFrame()

def calculate_monthly_stats(df, target_month=None, target_year=None):
    if df.empty:
        return {
            'rental_income': 0,
            'business_income': 0,
            'operating_expenses': 0,
            'capital_investments': 0,
            'net_income': 0,
            'transaction_count': 0
        }
    
    if target_month is not None and target_year is not None:
        df_month = df[(df['date'].dt.month == target_month) & (df['date'].dt.year == target_year)]
    else:
        current_date = datetime.now()
        df_month = df[(df['date'].dt.month == current_date.month) & (df['date'].dt.year == current_date.year)]
    
    rental_income = df_month[(df_month['category'] == 'rental_income') | 
                            ((df_month['account'] == 'rental') & (df_month['amount'] > 0))]['amount'].sum()
    
    business_income = df_month[(df_month['category'] == 'business_income') | 
                              ((df_month['account'] == 'business') & (df_month['amount'] > 0))]['amount'].sum()
    
    operating_expenses = df_month[(df_month['amount'] < 0) & (~df_month['is_capital'])]['amount'].abs().sum()
    
    capital_investments = df_month[df_month['is_capital']]['amount'].abs().sum()
    
    net_income = rental_income + business_income - operating_expenses
    
    return {
        'rental_income': rental_income,
        'business_income': business_income,
        'operating_expenses': operating_expenses,
        'capital_investments': capital_investments,
        'net_income': net_income,
        'transaction_count': len(df_month)
    }

def main():
    st.title("🏦 Business & Rental Income Tracker Pro")
    st.markdown("**Advanced Financial Management with Auto-Categorization**")
    
    st.sidebar.title("📁 Upload CSV Files")
    
    account_types = {
        'rental': 'Rental Income (0111)',
        'realestate': 'Real Estate (8529)', 
        'business': 'Business Income (7991)',
        'expenses': 'Business Expenses (2299)',
        'chase': 'Chase Visa Prime (2434)'
    }
    
    uploaded_files = {}
    for account_key, account_name in account_types.items():
        uploaded_files[account_key] = st.sidebar.file_uploader(
            f"{account_name}",
            type=['csv'],
            key=f"upload_{account_key}"
        )
    
    all_dfs = []
    for account_type, file in uploaded_files.items():
        if file is not None:
            df = process_csv_file(file, account_type)
            if not df.empty:
                all_dfs.append(df)
                st.sidebar.success(f"✅ {account_types[account_type]}: {len(df)} transactions")
    
    if all_dfs:
        st.session_state.transactions = pd.concat(all_dfs, ignore_index=True)
        st.session_state.transactions = st.session_state.transactions.sort_values('date', ascending=False)
    
    if not st.session_state.transactions.empty:
        df = st.session_state.transactions
        
        current_stats = calculate_monthly_stats(df)
        
        col1, col2, col3, col4, col5 = st.columns(5)
        
        with col1:
            st.metric("Monthly Rental Income", f"${current_stats['rental_income']:,.0f}")
        with col2:
            st.metric("Monthly Business Income", f"${current_stats['business_income']:,.0f}")
        with col3:
            st.metric("Monthly Expenses", f"${current_stats['operating_expenses']:,.0f}")
        with col4:
            st.metric("Net Monthly Income", f"${current_stats['net_income']:,.0f}")
        with col5:
            st.metric("Capital Investments", f"${current_stats['capital_investments']:,.0f}")
        
        col1, col2 = st.columns([2, 1])
        
        with col1:
            st.subheader("📈 Interactive Income & Expense Trends")
            
            df['year_month'] = df['date'].dt.to_period('M').astype(str)
            
            monthly_summary = df.groupby(['year_month']).agg({
                'amount': [
                    lambda x: x[x > 0].sum(),
                    lambda x: x[(x < 0) & (~df.loc[x.index, 'is_capital'])].abs().sum(),
                    lambda x: x[df.loc[x.index, 'is_capital']].abs().sum()
                ]
            }).round(2)
            
            monthly_summary.columns = ['Total_Income', 'Operating_Expenses', 'Capital_Investments']
            monthly_summary = monthly_summary.reset_index()
            monthly_summary['Net_Income'] = monthly_summary['Total_Income'] - monthly_summary['Operating_Expenses']
            
            if not monthly_summary.empty and len(monthly_summary) > 1:
                fig = go.Figure()
                
                fig.add_trace(go.Scatter(
                    x=monthly_summary['year_month'],
                    y=monthly_summary['Total_Income'],
                    mode='lines+markers',
                    name='Total Income',
                    line=dict(color='#10b981', width=3),
                    marker=dict(size=8)
                ))
                
                fig.add_trace(go.Scatter(
                    x=monthly_summary['year_month'],
                    y=monthly_summary['Operating_Expenses'],
                    mode='lines+markers',
                    name='Operating Expenses',
                    line=dict(color='#ef4444', width=3),
                    marker=dict(size=8)
                ))
                
                fig.add_trace(go.Scatter(
                    x=monthly_summary['year_month'],
                    y=monthly_summary['Net_Income'],
                    mode='lines+markers',
                    name='Net Income',
                    line=dict(color='#667eea', width=3),
                    marker=dict(size=8)
                ))
                
                fig.add_trace(go.Bar(
                    x=monthly_summary['year_month'],
                    y=monthly_summary['Capital_Investments'],
                    name='Capital Investments',
                    marker_color='rgba(245, 158, 11, 0.6)'
                ))
                
                fig.update_layout(
                    title='Monthly Financial Performance',
                    xaxis_title='Month',
                    yaxis_title='Amount ($)',
                    hovermode='x unified',
                    template='plotly_white',
                    height=500
                )
                
                st.plotly_chart(fig, use_container_width=True)
                
                st.subheader("💰 Income vs Expenses Breakdown")
                
                category_summary = df.groupby('category')['amount'].apply(lambda x: x.abs().sum()).reset_index()
                category_summary['type'] = category_summary['category'].apply(
                    lambda x: 'Income' if 'income' in x else ('Capital' if x.startswith('capital_') else 'Operating Expense')
                )
                
                fig2 = px.treemap(
                    category_summary,
                    path=['type', 'category'],
                    values='amount',
                    title='Financial Category Breakdown',
                    color='amount',
                    color_continuous_scale='RdYlGn_r'
                )
                fig2.update_layout(height=400)
                st.plotly_chart(fig2, use_container_width=True)
                
            else:
                st.info("Upload more data to see trend charts.")
        
        with col2:
            st.subheader("📊 Current Month Analysis")
            
            current_month = datetime.now().month
            current_year = datetime.now().year
            df_current = df[(df['date'].dt.month == current_month) & (df['date'].dt.year == current_year)]
            
            if not df_current.empty:
                income_data = df_current[df_current['amount'] > 0].groupby('category')['amount'].sum()
                if not income_data.empty:
                    fig3 = px.pie(
                        values=income_data.values,
                        names=[cat.replace('_', ' ').title() for cat in income_data.index],
                        title='Income Sources'
                    )
                    fig3.update_layout(height=300, showlegend=False)
                    st.plotly_chart(fig3, use_container_width=True)
                
                expense_data = df_current[(df_current['amount'] < 0) & (~df_current['is_capital'])].groupby('category')['amount'].apply(lambda x: x.abs().sum())
                if not expense_data.empty:
                    fig4 = px.pie(
                        values=expense_data.values,
                        names=[cat.replace('_', ' ').title() for cat in expense_data.index],
                        title='Operating Expenses'
                    )
                    fig4.update_layout(height=300, showlegend=False)
                    st.plotly_chart(fig4, use_container_width=True)
            else:
                st.info("No current month transactions.")
        
        st.subheader("📈 Historical Performance")
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            if st.button("💾 Save Current Month"):
                current_date = datetime.now()
                month_key = f"{current_date.year}-{current_date.month:02d}"
                st.session_state.monthly_history[month_key] = current_stats
                st.success(f"✅ {month_key} data saved!")
        
        with col2:
            if st.button("📊 View Historical Trends"):
                if st.session_state.monthly_history:
                    st.subheader("Monthly History")
                    history_df = pd.DataFrame(st.session_state.monthly_history).T
                    history_df.index.name = 'Month'
                    
                    currency_cols = ['rental_income', 'business_income', 'operating_expenses', 'capital_investments', 'net_income']
                    for col in currency_cols:
                        if col in history_df.columns:
                            history_df[col] = history_df[col].apply(lambda x: f"${x:,.0f}")
                    
                    st.dataframe(history_df, use_container_width=True)
                    
                    if len(st.session_state.monthly_history) > 1:
                        trend_data = pd.DataFrame(st.session_state.monthly_history).T
                        
                        fig_hist = go.Figure()
                        
                        fig_hist.add_trace(go.Scatter(
                            x=trend_data.index,
                            y=trend_data['rental_income'],
                            mode='lines+markers',
                            name='Rental Income',
                            line=dict(color='#10b981', width=2)
                        ))
                        
                        fig_hist.add_trace(go.Scatter(
                            x=trend_data.index,
                            y=trend_data['business_income'],
                            mode='lines+markers',
                            name='Business Income',
                            line=dict(color='#667eea', width=2)
                        ))
                        
                        fig_hist.add_trace(go.Scatter(
                            x=trend_data.index,
                            y=trend_data['operating_expenses'],
                            mode='lines+markers',
                            name='Operating Expenses',
                            line=dict(color='#ef4444', width=2)
                        ))
                        
                        fig_hist.update_layout(
                            title='Historical Monthly Trends',
                            xaxis_title='Month',
                            yaxis_title='Amount ($)',
                            height=400,
                            template='plotly_white'
                        )
                        
                        st.plotly_chart(fig_hist, use_container_width=True)
                else:
                    st.info("No historical data saved yet.")
        
        with col3:
            if st.button("🏠 Property Breakdown"):
                st.subheader("Performance by Property")
                
                property_data = []
                for prop in st.session_state.properties:
                    prop_transactions = df[df['property'] == prop['id']]
                    if not prop_transactions.empty:
                        prop_income = prop_transactions[prop_transactions['amount'] > 0]['amount'].sum()
                        prop_expenses = prop_transactions[(prop_transactions['amount'] < 0) & (~prop_transactions['is_capital'])]['amount'].abs().sum()
                        prop_capital = prop_transactions[prop_transactions['is_capital']]['amount'].abs().sum()
                        prop_net = prop_income - prop_expenses
                        
                        property_data.append({
                            'Property': prop['name'],
                            'Income': prop_income,
                            'Expenses': prop_expenses,
                            'Capital': prop_capital,
                            'Net': prop_net
                        })
                
                if property_data:
                    prop_df = pd.DataFrame(property_data)
                    
                    display_df = prop_df.copy()
                    for col in ['Income', 'Expenses', 'Capital', 'Net']:
                        display_df[col] = display_df[col].apply(lambda x: f"${x:,.0f}")
                    
                    st.dataframe(display_df, use_container_width=True)
                    
                    if len(property_data) > 1:
                        st.subheader("Property Performance Chart")
                        
                        fig_prop = go.Figure()
                        
                        fig_prop.add_trace(go.Bar(
                            name='Income',
                            x=prop_df['Property'],
                            y=prop_df['Income'],
                            marker_color='#10b981'
                        ))
                        
                        fig_prop.add_trace(go.Bar(
                            name='Expenses',
                            x=prop_df['Property'],
                            y=prop_df['Expenses'],
                            marker_color='#ef4444'
                        ))
                        
                        fig_prop.add_trace(go.Bar(
                            name='Net Income',
                            x=prop_df['Property'],
                            y=prop_df['Net'],
                            marker_color='#667eea'
                        ))
                        
                        fig_prop.update_layout(
                            title='Property Performance Comparison',
                            xaxis_title='Property',
                            yaxis_title='Amount ($)',
                            barmode='group',
                            height=500,
                            template='plotly_white',
                            xaxis={'tickangle': 45}
                        )
                        
                        st.plotly_chart(fig_prop, use_container_width=True)
                else:
                    st.info("No property assignments found.")
        
        with col4:
            if st.button("💰 Capital Investments"):
                capital_df = df[df['is_capital']].copy()
                if not capital_df.empty:
                    st.subheader("Capital Investments")
                    
                    capital_summary = capital_df.groupby(['property', 'category']).agg({
                        'amount': lambda x: x.abs().sum(),
                        'description': lambda x: ', '.join(x.unique()[:3])
                    }).round(2)
                    capital_summary.columns = ['Total Amount', 'Items']
                    capital_summary['Total Amount'] = capital_summary['Total Amount'].apply(lambda x: f"${x:,.0f}")
                    
                    st.dataframe(capital_summary, use_container_width=True)
                    
                    total_capital = capital_df['amount'].abs().sum()
                    st.metric("Total Capital Investments", f"${total_capital:,.0f}")
                else:
                    st.info("No capital investments found.")
        
        st.subheader("💳 Transaction Management")
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            account_filter = st.selectbox("Filter by Account", ['All'] + list(account_types.keys()))
        
        with col2:
            category_filter = st.selectbox("Filter by Category", ['All'] + sorted(df['category'].unique().tolist()))
        
        with col3:
            show_capital_only = st.checkbox("Capital Investments Only")
        
        with col4:
            property_filter = st.selectbox("Filter by Property", ['All'] + [prop['id'] for prop in st.session_state.properties])
        
        filtered_df = df.copy()
        
        if account_filter != 'All':
            filtered_df = filtered_df[filtered_df['account'] == account_filter]
        
        if category_filter != 'All':
            filtered_df = filtered_df[filtered_df['category'] == category_filter]
        
        if show_capital_only:
            filtered_df = filtered_df[filtered_df['is_capital']]
            
        if property_filter != 'All':
            filtered_df = filtered_df[filtered_df['property'] == property_filter]
        
        if not filtered_df.empty:
            st.write(f"Showing {len(filtered_df)} transactions")
            
            edited_df = st.data_editor(
                filtered_df.head(100)[['date', 'account', 'description', 'amount', 'category', 'property', 'is_capital', 'notes']],
                column_config={
                    'date': st.column_config.DateColumn("Date"),
                    'account': st.column_config.TextColumn("Account", disabled=True),
                    'description': st.column_config.TextColumn("Description", width="large"),
                    'amount': st.column_config.NumberColumn("Amount", format="$%.2f"),
                    'category': st.column_config.SelectboxColumn("Category", options=list(AUTO_CATEGORIES.keys()) + ['uncategorized']),
                    'property': st.column_config.SelectboxColumn("Property", options=[prop['id'] for prop in st.session_state.properties]),
                    'is_capital': st.column_config.CheckboxColumn("Capital Investment"),
                    'notes': st.column_config.TextColumn("Notes", width="medium")
                },
                num_rows="dynamic",
                use_container_width=True
            )
        
        st.subheader("📄 Export Data")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            if st.button("📊 Export All Transactions"):
                csv = df.to_csv(index=False)
                st.download_button(
                    label="Download All Transactions CSV",
                    data=csv,
                    file_name=f"all_transactions_{datetime.now().strftime('%Y%m%d')}.csv",
                    mime="text/csv"
                )
        
        with col2:
            if st.button("💰 Export Capital Investments"):
                capital_df = df[df['is_capital']]
                if not capital_df.empty:
                    csv = capital_df.to_csv(index=False)
                    st.download_button(
                        label="Download Capital Investments CSV",
                        data=csv,
                        file_name=f"capital_investments_{datetime.now().strftime('%Y%m%d')}.csv",
                        mime="text/csv"
                    )
                else:
                    st.warning("No capital investments to export")
        
        with col3:
            if st.button("📈 Export Monthly History"):
                if st.session_state.monthly_history:
                    history_df = pd.DataFrame(st.session_state.monthly_history).T
                    csv = history_df.to_csv()
                    st.download_button(
                        label="Download Monthly History CSV",
                        data=csv,
                        file_name=f"monthly_history_{datetime.now().strftime('%Y%m%d')}.csv",
                        mime="text/csv"
                    )
                else:
                    st.warning("No historical data to export")
    
    else:
        st.info("👆 Upload your CSV files using the sidebar to get started!")
        
        with st.expander("📋 How to Use This App"):
            st.markdown("""
            ## 🚀 Getting Started
            
            ### 1. Upload CSV Files
            Upload CSV files from your Chase bank accounts using the sidebar.
            
            ### 2. Auto-Categorization
            Transactions are automatically categorized into income, expenses, and capital investments.
            
            ### 3. Interactive Charts
            View trends, breakdowns, and property performance with interactive Plotly charts.
            
            ### 4. Historical Tracking
            Save monthly summaries and track performance over time.
            
            ### 📋 Your Chase CSV Format
            Your CSV format is detected as:
            - **Details, Posting Date, Description, Amount, Type, Balance, DEBIT**
            
            The app automatically maps:
            - Date: "Posting Date"
            - Description: "Description" 
            - Amount: "Amount"
            
            ### 🔧 Troubleshooting
            - Check the sidebar for column detection results
            - Ensure CSV files are properly formatted
            - Look for sample processed data in sidebar
            """)

if __name__ == "__main__":
    main()