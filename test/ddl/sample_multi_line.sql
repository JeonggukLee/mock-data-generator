/*
 * 会計伝票ヘッダ
 */
CREATE TABLE account_doc_header( 
    id varchar (18), 
    created_by_id varchar (18), 
    last_modified_by_id varchar (18), 
    created_date timestamp without time zone, 
    last_modified_date timestamp without time zone, 
    owner_id varchar (18), 
    fudosan_grp_cd varchar (3), 
    ksha_cd varchar (6), 
    fiscal_year varchar (6), 
    account_doc_no varchar (10), 
    account_doc_type varchar (2) NOT NULL, 
    document_date date NOT NULL, 
    posting_date date, 
    suito_furikae_ymd date, 
    jissai_thik_ymd date, 
    kihyo_jigyosho_cd varchar (6), 
    hassei_gyomu_kbn varchar (2), 
    total_amount numeric (14), 
    not_post_flg varchar (1), 
    external_id varchar (255), 
    cancel_flg varchar (1), 
    in_time varchar (17), 
    up_time varchar (17), 
    in_user_id varchar (30), 
    up_user_id varchar (30), 
    in_apl_id varchar (30), 
    up_apl_id varchar (30), 
    PRIMARY KEY ( 
        fudosan_grp_cd, 
        ksha_cd, 
        fiscal_year, 
        account_doc_no
    )
);
COMMENT ON TABLE account_doc_header IS '会計伝票ヘッダ';
COMMENT ON COLUMN account_doc_header.id IS 'SalesforceID';
COMMENT ON COLUMN account_doc_header.created_by_id IS '作成者';
COMMENT ON COLUMN account_doc_header.last_modified_by_id IS '最終更新者';
COMMENT ON COLUMN account_doc_header.created_date IS '作成日';
COMMENT ON COLUMN account_doc_header.last_modified_date IS '最終更新日';
COMMENT ON COLUMN account_doc_header.owner_id IS '所有者';
COMMENT ON COLUMN account_doc_header.fudosan_grp_cd IS '不動産グループコード';
COMMENT ON COLUMN account_doc_header.ksha_cd IS '会社コード';
COMMENT ON COLUMN account_doc_header.fiscal_year IS '勘定年月';
COMMENT ON COLUMN account_doc_header.account_doc_no IS '会計伝票番号';
COMMENT ON COLUMN account_doc_header.account_doc_type IS '伝票タイプ';
COMMENT ON COLUMN account_doc_header.document_date IS '伝票日付';
COMMENT ON COLUMN account_doc_header.posting_date IS '転記日付';
COMMENT ON COLUMN account_doc_header.suito_furikae_ymd IS '出納振替年月日';
COMMENT ON COLUMN account_doc_header.jissai_thik_ymd IS '実際取引年月日';
COMMENT ON COLUMN account_doc_header.kihyo_jigyosho_cd IS '起票事業所コード';
COMMENT ON COLUMN account_doc_header.hassei_gyomu_kbn IS '発生業務区分';
COMMENT ON COLUMN account_doc_header.total_amount IS 'トータル金額';
COMMENT ON COLUMN account_doc_header.not_post_flg IS '未転記フラグ';
COMMENT ON COLUMN account_doc_header.external_id IS '外部ID';
COMMENT ON COLUMN account_doc_header.cancel_flg IS '取消フラグ';
COMMENT ON COLUMN account_doc_header.in_time IS '登録日時';
COMMENT ON COLUMN account_doc_header.up_time IS '更新日時';
COMMENT ON COLUMN account_doc_header.in_user_id IS '登録ユーザＩＤ';
COMMENT ON COLUMN account_doc_header.up_user_id IS '更新ユーザＩＤ';
COMMENT ON COLUMN account_doc_header.in_apl_id IS '登録アプリＩＤ';
COMMENT ON COLUMN account_doc_header.up_apl_id IS '更新アプリＩＤ';
