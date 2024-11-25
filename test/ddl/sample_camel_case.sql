CREATE TABLE  bankM (id  varchar(18) ,created_by_id  varchar(18) ,last_modified_by_id  varchar(18) ,created_date  timestamp without time zone ,last_modified_date  timestamp without time zone ,owner_id  varchar(18) ,name  varchar(18)  NOT NULL,ksha_cd  varchar(6) ,bnk_cd  varchar(6) ,suito_knr_jigyosho_cd  varchar(6) ,knr_jigyosho_cd  varchar(6) ,koza_sbkbn  numeric(1,0) ,zbnk_cd  varchar(4) ,zbshiten_cd  varchar(3) ,bnk_nm  varchar(20) ,shiten_nm  varchar(20) ,yokin_sbkbn  numeric(1,0) ,koza_shoken_no  varchar(10) ,koza_meiginin_knm  varchar(40) ,koza_meiginin_nm  varchar(50) ,kfr_itakusha_cd  varchar(10) ,kfr_itakusha_knm  varchar(40) ,fkom_irainin_cd  varchar(10) ,fkom_irainin_knm  varchar(40) ,so_furi_file_nm  varchar(15) ,so_furi_volume_nm  varchar(6) ,tdfkn_cd  varchar(2) ,shain_yo_tosha_cd  varchar(10) ,shain_yo_file_nm  varchar(15) ,shain_yo_volume_nm  varchar(6) ,cmsdummy_koza_kbn  varchar(1) ,kyotsu_koza_kbn  varchar(1) ,external_id  varchar(255)  NOT NULL UNIQUE,cancel_flg  varchar(1) ,in_time  varchar(17) ,up_time  varchar(17) ,in_user_id  varchar(30) ,up_user_id  varchar(30) ,in_apl_id  varchar(30) ,up_apl_id  varchar(30) ,PRIMARY KEY (ksha_cd, bnk_cd));
